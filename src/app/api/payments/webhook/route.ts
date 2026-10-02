import { NextResponse } from 'next/server'
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

type PaymentNotificationRow = {
  id: number
  order_id: number
  transaction_id: string | null
  payment_type: string | null
  amount: string | number
}

type OrderNotificationRow = {
  id: number
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
  return getText(value) || null
}

function getDecimal(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

function createWebhookResponse(message: string, status = 200) {
  return NextResponse.json({ message }, { status })
}

async function findPayment(
  invoiceNumber: string,
  transactionId: string
) {
  let order: OrderNotificationRow | null = null

  if (invoiceNumber) {
    const { data, error } = await db
      .from('orders')
      .select('id, invoice_number, order_status')
      .eq('invoice_number', invoiceNumber)
      .maybeSingle()

    if (error) throw error
    order = data as OrderNotificationRow | null
  }

  let payment: PaymentNotificationRow | null = null

  if (order) {
    const { data, error } = await db
      .from('payments')
      .select('id, order_id, transaction_id, payment_type, amount')
      .eq('order_id', order.id)
      .maybeSingle()

    if (error) throw error
    payment = data as PaymentNotificationRow | null
  }

  if (!payment && transactionId) {
    const { data, error } = await db
      .from('payments')
      .select('id, order_id, transaction_id, payment_type, amount')
      .eq('transaction_id', transactionId)
      .maybeSingle()

    if (error) throw error
    payment = data as PaymentNotificationRow | null
  }

  if (!payment) return null

  if (!order) {
    const { data, error } = await db
      .from('orders')
      .select('id, invoice_number, order_status')
      .eq('id', payment.order_id)
      .maybeSingle()

    if (error) throw error
    order = data as OrderNotificationRow | null
  }

  return order ? { payment, order } : null
}

export async function POST(req: Request) {
  let body: WebhookBody

  try {
    body = (await req.json()) as WebhookBody
  } catch {
    return createWebhookResponse('Invalid webhook payload', 400)
  }

  if (!verifyMidtransSignature(body)) {
    return createWebhookResponse('Invalid Midtrans signature', 401)
  }

  const transactionStatus =
    normalizeMidtransTransactionStatus(
      body.transaction_status
    )

  if (!transactionStatus) {
    return createWebhookResponse('Invalid transaction status', 400)
  }

  const invoiceNumber = getText(body.order_id)
  const midtransTransactionId = getText(body.transaction_id)

  if (!invoiceNumber && !midtransTransactionId) {
    return createWebhookResponse('Payment reference is required', 400)
  }

  const fraudStatus = getNullableText(body.fraud_status)
  const paymentType = getNullableText(body.payment_type)
  const statusCode = getNullableText(body.status_code)
  const statusMessage = getNullableText(body.status_message)
  const transactionTime = getNullableText(body.transaction_time)
  const settlementTimeFromBody = getNullableText(
    body.settlement_time
  )
  const expiryTime = getNullableText(body.expiry_time)
  const grossAmount = getDecimal(body.gross_amount)

  try {
    await expirePendingPayments()

    const found = await findPayment(
      invoiceNumber,
      midtransTransactionId
    )

    if (!found) {
      return createWebhookResponse('Payment not found', 404)
    }

    const { payment, order } = found
    const paymentStatus = getPaymentStatusFromMidtrans(
      transactionStatus,
      fraudStatus
    )
    const orderState = getOrderStateForPayment(
      paymentStatus,
      order.order_status
    )
    const settlementTime =
      paymentStatus === 'paid'
        ? settlementTimeFromBody || new Date().toISOString()
        : null
    const paidAt =
      paymentStatus === 'paid' ? settlementTime : null
    const logTransactionId =
      midtransTransactionId ||
      payment.transaction_id ||
      order.invoice_number

    const { error: paymentError } = await db
      .from('payments')
      .update({
        payment_type: paymentType || payment.payment_type,
        transaction_id:
          midtransTransactionId || payment.transaction_id,
        transaction_time: transactionTime || undefined,
        settlement_time: settlementTime,
        expiry_time: expiryTime || undefined,
        raw_response: body,
        transaction_status: transactionStatus,
        paid_at: paidAt,
      })
      .eq('id', payment.id)

    if (paymentError) throw paymentError

    const { error: orderError } = await db
      .from('orders')
      .update({
        payment_status: orderState.paymentStatus,
        order_status: orderState.orderStatus,
        paid_at: paidAt,
      })
      .eq('id', payment.order_id)

    if (orderError) throw orderError

    const { error: logError } = await db
      .from('payment_logs')
      .insert({
        payment_id: payment.id,
        transaction_id: logTransactionId,
        order_id: payment.order_id,
        transaction_status: transactionStatus,
        payment_type: paymentType,
        fraud_status: fraudStatus,
        status_code: statusCode,
        status_message: statusMessage,
        gross_amount: grossAmount ?? payment.amount,
        currency: getText(body.currency) || 'IDR',
        raw_response: body,
      })

    if (logError) throw logError

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
    console.error('MIDTRANS WEBHOOK ERROR:', error)

    return createWebhookResponse('Failed to process webhook', 500)
  }
}
