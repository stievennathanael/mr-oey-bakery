import type {
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2'
import type {
  Pool,
  PoolConnection,
} from 'mysql2/promise'
import { db } from '@/lib/db'
import {
  getMidtransTransactionStatus,
  isMidtransServerConfigured,
  normalizeMidtransTransactionStatus,
} from '@/lib/midtrans'
import {
  getOrderStateForPayment,
  getPaymentStatusFromMidtrans,
} from '@/lib/payment-status'

type Queryable = Pool | PoolConnection

type SyncPaymentRow = RowDataPacket & {
  id: number
  order_id: number
  invoice_number: string
  transaction_id: string | null
  transaction_status: string
  payment_status: string
  order_status: string
  amount: string | number
}

export type MidtransPaymentSyncResult = {
  checked: number
  updated: number
  failed: number
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

async function writePaymentLog(
  connection: Queryable,
  payment: SyncPaymentRow,
  payload: Record<string, unknown>,
  transactionStatus: string,
  transactionId: string | null,
  rawResponse: string
) {
  try {
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
        transactionId ||
          payment.transaction_id ||
          payment.invoice_number,
        payment.order_id,
        transactionStatus,
        getNullableText(payload.payment_type),
        getNullableText(payload.fraud_status),
        getNullableText(payload.status_code),
        getNullableText(payload.status_message),
        getDecimal(payload.gross_amount) ??
          payment.amount,
        getText(payload.currency) || 'IDR',
        rawResponse,
      ]
    )
  } catch (error) {
    console.error(
      'MIDTRANS PAYMENT LOG ERROR:',
      error
    )
  }
}

async function applyMidtransStatus(
  connection: Queryable,
  payment: SyncPaymentRow,
  payload: Record<string, unknown>
) {
  const transactionStatus =
    normalizeMidtransTransactionStatus(
      payload.transaction_status
    )

  if (!transactionStatus) {
    return false
  }

  const fraudStatus = getNullableText(
    payload.fraud_status
  )
  const transactionId = getNullableText(
    payload.transaction_id
  )
  const paymentType = getNullableText(
    payload.payment_type
  )
  const transactionTime = getNullableText(
    payload.transaction_time
  )
  const settlementTimeFromPayload =
    getNullableText(payload.settlement_time)
  const expiryTime = getNullableText(
    payload.expiry_time
  )
  const paymentStatus =
    getPaymentStatusFromMidtrans(
      transactionStatus,
      fraudStatus
    )
  const orderState = getOrderStateForPayment(
    paymentStatus,
    payment.order_status
  )
  const paidAt =
    paymentStatus === 'paid'
      ? settlementTimeFromPayload ||
        transactionTime ||
        new Date()
      : null
  const settlementTime =
    paymentStatus === 'paid' ? paidAt : null
  const rawResponse = JSON.stringify(payload)
  const hasChanged =
    payment.transaction_status !==
      transactionStatus ||
    payment.payment_status !==
      orderState.paymentStatus ||
    payment.order_status !==
      orderState.orderStatus ||
    Boolean(
      transactionId &&
        transactionId !== payment.transaction_id
    )

  await connection.query<ResultSetHeader>(
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
      transactionId,
      transactionTime,
      settlementTime,
      expiryTime,
      rawResponse,
      transactionStatus,
      paidAt,
      payment.id,
    ]
  )

  await connection.query<ResultSetHeader>(
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

  if (hasChanged) {
    await writePaymentLog(
      connection,
      payment,
      payload,
      transactionStatus,
      transactionId,
      rawResponse
    )
  }

  return hasChanged
}

async function syncRowsWithMidtrans(
  rows: SyncPaymentRow[],
  connection: Queryable
) {
  const result: MidtransPaymentSyncResult = {
    checked: 0,
    updated: 0,
    failed: 0,
  }

  if (!isMidtransServerConfigured()) {
    return result
  }

  for (const payment of rows) {
    result.checked += 1

    try {
      const payload =
        await getMidtransTransactionStatus(
          payment.invoice_number
        )
      const updated =
        await applyMidtransStatus(
          connection,
          payment,
          payload
        )

      if (updated) {
        result.updated += 1
      }
    } catch (error) {
      result.failed += 1
      console.error(
        'MIDTRANS STATUS SYNC ERROR:',
        error
      )
    }
  }

  return result
}

export async function syncPaymentWithMidtrans(
  paymentId: number,
  connection: Queryable = db
) {
  if (!isMidtransServerConfigured()) {
    return {
      checked: 0,
      updated: 0,
      failed: 0,
    }
  }

  const [rows] =
    await connection.query<SyncPaymentRow[]>(
      `
      SELECT
        payments.id,
        payments.order_id,
        payments.transaction_id,
        payments.transaction_status,
        payments.amount,
        orders.invoice_number,
        orders.payment_status,
        orders.order_status
      FROM payments
      INNER JOIN orders
        ON payments.order_id = orders.id
      WHERE payments.id = ?
        AND payments.payment_provider = 'Midtrans'
      LIMIT 1
      `,
      [paymentId]
    )

  return syncRowsWithMidtrans(rows, connection)
}

export async function syncPendingPaymentsWithMidtrans({
  userId,
  limit = 10,
  connection = db,
}: {
  userId?: number
  limit?: number
  connection?: Queryable
} = {}) {
  if (!isMidtransServerConfigured()) {
    return {
      checked: 0,
      updated: 0,
      failed: 0,
    }
  }

  const params: Array<number | string> = []
  let userFilter = ''

  if (userId) {
    userFilter = 'AND orders.user_id = ?'
    params.push(userId)
  }

  params.push(Math.max(1, Math.min(limit, 25)))

  const [rows] =
    await connection.query<SyncPaymentRow[]>(
      `
      SELECT
        payments.id,
        payments.order_id,
        payments.transaction_id,
        payments.transaction_status,
        payments.amount,
        orders.invoice_number,
        orders.payment_status,
        orders.order_status
      FROM payments
      INNER JOIN orders
        ON payments.order_id = orders.id
      WHERE payments.payment_provider = 'Midtrans'
        AND payments.transaction_status = 'pending'
        AND orders.payment_status IN ('unpaid', 'pending')
        ${userFilter}
      ORDER BY payments.created_at DESC
      LIMIT ?
      `,
      params
    )

  return syncRowsWithMidtrans(rows, connection)
}
