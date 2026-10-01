import { NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2'
import { db } from '@/lib/db'
import {
  expirePendingPayments,
  getOrderStateForPayment,
  getPaymentStatusFromMidtrans,
} from '@/lib/payment-status'
import {
  normalizeMidtransTransactionStatus,
  verifyMidtransSignature,
} from '@/lib/midtrans'

type WebhookBody = Record<string, unknown>

type PaymentNotificationRow =
  RowDataPacket & {
    id: number
    order_id: number
    transaction_id: string | null
    amount: string | number
    invoice_number: string
    order_status: string
  }

function getText(value: unknown) {
  if (
    typeof value !== 'string' &&
    typeof value !== 'number'
  ) {
    return ''
  }

  return String(value).trim()
}

function getNullableText(value: unknown) {
  const text = getText(value)
  return text || null
}

function getDecimal(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function createWebhookResponse(
  message: string,
  status = 200
) {
  return NextResponse.json(
    {
      message,
    },
    {
      status,
    }
  )
}

export async function POST(req: Request) {
  let body: WebhookBody

  try {
    body = (await req.json()) as WebhookBody
  } catch {
    return createWebhookResponse(
      'Invalid webhook payload',
      400
    )
  }

  if (!verifyMidtransSignature(body)) {
    return createWebhookResponse(
      'Invalid Midtrans signature',
      401
    )
  }

  const transactionStatus =
    normalizeMidtransTransactionStatus(
      body.transaction_status
    )

  if (!transactionStatus) {
    return createWebhookResponse(
      'Invalid transaction status',
      400
    )
  }

  const invoiceNumber = getText(body.order_id)
  const midtransTransactionId = getText(
    body.transaction_id
  )

  if (!invoiceNumber && !midtransTransactionId) {
    return createWebhookResponse(
      'Payment reference is required',
      400
    )
  }

  const fraudStatus = getNullableText(
    body.fraud_status
  )
  const paymentType = getNullableText(
    body.payment_type
  )
  const statusCode = getNullableText(
    body.status_code
  )
  const statusMessage = getNullableText(
    body.status_message
  )
  const transactionTime = getNullableText(
    body.transaction_time
  )
  const settlementTimeFromBody =
    getNullableText(body.settlement_time)
  const expiryTime = getNullableText(
    body.expiry_time
  )
  const rawResponse = JSON.stringify(body)
  const grossAmount = getDecimal(
    body.gross_amount
  )

  const connection =
    await db.getConnection()

  try {
    await connection.beginTransaction()
    await expirePendingPayments(connection)

    const [rows] =
      await connection.query<PaymentNotificationRow[]>(
        `
        SELECT
          payments.id,
          payments.order_id,
          payments.transaction_id,
          payments.amount,
          orders.invoice_number,
          orders.order_status
        FROM payments
        INNER JOIN orders
          ON payments.order_id = orders.id
        WHERE orders.invoice_number = ?
          OR payments.transaction_id = ?
        LIMIT 1
        FOR UPDATE
        `,
        [
          invoiceNumber,
          midtransTransactionId,
        ]
      )

    const payment = rows[0]

    if (!payment) {
      await connection.rollback()
      return createWebhookResponse(
        'Payment not found',
        404
      )
    }

    const paymentStatus =
      getPaymentStatusFromMidtrans(
        transactionStatus,
        fraudStatus
      )
    const orderState = getOrderStateForPayment(
      paymentStatus,
      payment.order_status
    )
    const settlementTime =
      paymentStatus === 'paid'
        ? settlementTimeFromBody || new Date()
        : null
    const paidAt =
      paymentStatus === 'paid'
        ? settlementTime
        : null
    const logTransactionId =
      midtransTransactionId ||
      payment.transaction_id ||
      invoiceNumber

    await connection.query(
      `
      UPDATE payments
      SET
        payment_type = COALESCE(?, payment_type),
        transaction_id = COALESCE(?, transaction_id),
        transaction_time = COALESCE(?, transaction_time),
        settlement_time = ?,
        expiry_time = COALESCE(?, expiry_time),
        raw_response = ?,
        transaction_status = ?,
        paid_at = ?
      WHERE id = ?
      `,
      [
        paymentType,
        midtransTransactionId || null,
        transactionTime,
        settlementTime,
        expiryTime,
        rawResponse,
        transactionStatus,
        paidAt,
        payment.id,
      ]
    )

    await connection.query(
      `
      UPDATE orders
      SET
        payment_status = ?,
        order_status = ?,
        paid_at = ?
      WHERE id = ?
      `,
      [
        orderState.paymentStatus,
        orderState.orderStatus,
        paidAt,
        payment.order_id,
      ]
    )

    await connection.query(
      `
      INSERT INTO payment_logs
      (
        payment_id,
        transaction_id,
        order_id,
        transaction_status,
        payment_type,
        fraud_status,
        status_code,
        status_message,
        gross_amount,
        currency,
        raw_response
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        payment.id,
        logTransactionId,
        payment.order_id,
        transactionStatus,
        paymentType,
        fraudStatus,
        statusCode,
        statusMessage,
        grossAmount || payment.amount,
        getText(body.currency) || 'IDR',
        rawResponse,
      ]
    )

    await connection.commit()

    return NextResponse.json({
      message: 'Webhook processed',
      payment: {
        id: payment.id,
        order_id: payment.order_id,
        status: paymentStatus,
        transaction_status: transactionStatus,
      },
      order: {
        id: payment.order_id,
        payment_status: orderState.paymentStatus,
        order_status: orderState.orderStatus,
      },
    })
  } catch (error) {
    await connection.rollback()

    console.error(
      'MIDTRANS WEBHOOK ERROR:',
      error
    )

    return createWebhookResponse(
      'Failed to process webhook',
      500
    )
  } finally {
    connection.release()
  }
}
