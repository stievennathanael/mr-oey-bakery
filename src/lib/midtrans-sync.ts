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

type SyncPaymentRow = {
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
  return getText(value) || null
}

function getDecimal(value: unknown) {
  const number = Number(value)
  return Number.isFinite(number) ? number : null
}

async function writePaymentLog(
  payment: SyncPaymentRow,
  payload: Record<string, unknown>,
  transactionStatus: string,
  transactionId: string | null
) {
  const { error } = await db.from('payment_logs').insert({
    payment_id: payment.id,
    transaction_id:
      transactionId ||
      payment.transaction_id ||
      payment.invoice_number,
    order_id: payment.order_id,
    transaction_status: transactionStatus,
    payment_type: getNullableText(payload.payment_type),
    fraud_status: getNullableText(payload.fraud_status),
    status_code: getNullableText(payload.status_code),
    status_message: getNullableText(payload.status_message),
    gross_amount:
      getDecimal(payload.gross_amount) ?? payment.amount,
    currency: getText(payload.currency) || 'IDR',
    raw_response: payload,
  })

  if (error) {
    console.error('MIDTRANS PAYMENT LOG ERROR:', error)
  }
}

async function applyMidtransStatus(
  payment: SyncPaymentRow,
  payload: Record<string, unknown>
) {
  const transactionStatus =
    normalizeMidtransTransactionStatus(
      payload.transaction_status
    )

  if (!transactionStatus) return false

  const fraudStatus = getNullableText(payload.fraud_status)
  const transactionId = getNullableText(payload.transaction_id)
  const paymentType = getNullableText(payload.payment_type)
  const transactionTime = getNullableText(
    payload.transaction_time
  )
  const settlementTimeFromPayload = getNullableText(
    payload.settlement_time
  )
  const expiryTime = getNullableText(payload.expiry_time)
  const paymentStatus = getPaymentStatusFromMidtrans(
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
        new Date().toISOString()
      : null
  const settlementTime =
    paymentStatus === 'paid' ? paidAt : null
  const hasChanged =
    payment.transaction_status !== transactionStatus ||
    payment.payment_status !== orderState.paymentStatus ||
    payment.order_status !== orderState.orderStatus ||
    Boolean(
      transactionId &&
        transactionId !== payment.transaction_id
    )

  const { error: paymentError } = await db
    .from('payments')
    .update({
      payment_type: paymentType || undefined,
      transaction_id:
        transactionId || payment.transaction_id,
      transaction_time: transactionTime || undefined,
      settlement_time: settlementTime,
      expiry_time: expiryTime || undefined,
      raw_response: payload,
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

  if (hasChanged) {
    await writePaymentLog(
      payment,
      payload,
      transactionStatus,
      transactionId
    )
  }

  return hasChanged
}

async function syncRowsWithMidtrans(rows: SyncPaymentRow[]) {
  const result: MidtransPaymentSyncResult = {
    checked: 0,
    updated: 0,
    failed: 0,
  }

  if (!isMidtransServerConfigured()) return result

  for (const payment of rows) {
    result.checked += 1

    try {
      const payload = await getMidtransTransactionStatus(
        payment.invoice_number
      )
      const updated = await applyMidtransStatus(
        payment,
        payload
      )

      if (updated) result.updated += 1
    } catch (error) {
      result.failed += 1
      console.error('MIDTRANS STATUS SYNC ERROR:', error)
    }
  }

  return result
}

async function getSyncPaymentRows({
  paymentId,
  userId,
  limit,
}: {
  paymentId?: number
  userId?: number
  limit?: number
}) {
  let orderQuery = db
    .from('orders')
    .select(
      'id, invoice_number, payment_status, order_status, user_id'
    )
    .in('payment_status', ['unpaid', 'pending'])

  if (userId) {
    orderQuery = orderQuery.eq('user_id', userId)
  }

  const { data: orders, error: orderError } = await orderQuery

  if (orderError) throw orderError

  const orderIds = (orders || []).map((order) => order.id)

  if (!orderIds.length) return []

  let paymentQuery = db
    .from('payments')
    .select(
      'id, order_id, transaction_id, transaction_status, amount'
    )
    .in('order_id', orderIds)
    .eq('payment_provider', 'Midtrans')

  if (paymentId) {
    paymentQuery = paymentQuery.eq('id', paymentId)
  } else {
    paymentQuery = paymentQuery
      .eq('transaction_status', 'pending')
      .order('created_at', { ascending: false })
      .limit(Math.max(1, Math.min(limit || 10, 25)))
  }

  const { data: payments, error: paymentError } =
    await paymentQuery

  if (paymentError) throw paymentError

  const ordersById = new Map(
    (orders || []).map((order) => [order.id, order])
  )

  return (payments || []).flatMap((payment) => {
    const order = ordersById.get(payment.order_id)

    if (!order) return []

    return [
      {
        ...payment,
        invoice_number: order.invoice_number,
        payment_status: order.payment_status,
        order_status: order.order_status,
      } as SyncPaymentRow,
    ]
  })
}

export async function syncPaymentWithMidtrans(
  paymentId: number
) {
  if (!isMidtransServerConfigured()) {
    return { checked: 0, updated: 0, failed: 0 }
  }

  const rows = await getSyncPaymentRows({ paymentId })
  return syncRowsWithMidtrans(rows)
}

export async function syncPendingPaymentsWithMidtrans({
  userId,
  limit = 10,
}: {
  userId?: number
  limit?: number
} = {}) {
  if (!isMidtransServerConfigured()) {
    return { checked: 0, updated: 0, failed: 0 }
  }

  const rows = await getSyncPaymentRows({ userId, limit })
  return syncRowsWithMidtrans(rows)
}
