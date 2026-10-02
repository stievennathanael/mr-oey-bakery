import { db } from '@/lib/db'
import type { MidtransTransactionStatus } from '@/lib/midtrans'

export const paymentStatuses = [
  'pending',
  'paid',
  'failed',
  'expired',
  'cancelled',
] as const

export type PaymentStatus =
  (typeof paymentStatuses)[number]

export type PaymentReference = {
  paymentId?: number
  transactionId?: string
  invoiceNumber?: string
}

type PaymentRow = {
  id: number
  order_id: number
  transaction_status: string
  settlement_time: string | null
  paid_at: string | null
}

const DEFAULT_PAYMENT_EXPIRY_MINUTES = 15

export class PaymentStatusError extends Error {
  statusCode: number

  constructor(message: string, statusCode = 400) {
    super(message)
    this.name = 'PaymentStatusError'
    this.statusCode = statusCode
  }
}

export function getPaymentExpiryMinutes() {
  const minutes = Number(
    process.env.MIDTRANS_PAYMENT_EXPIRY_MINUTES ||
      DEFAULT_PAYMENT_EXPIRY_MINUTES
  )

  if (!Number.isFinite(minutes) || minutes <= 0) {
    return DEFAULT_PAYMENT_EXPIRY_MINUTES
  }

  return Math.floor(minutes)
}

export function getPaymentExpiresAt(
  value: string | Date | null | undefined
) {
  if (!value) return null

  const date = value instanceof Date ? value : new Date(value)

  return Number.isNaN(date.getTime())
    ? null
    : date.toISOString()
}

export function createPaymentExpiryDate(from = new Date()) {
  return new Date(
    from.getTime() +
      getPaymentExpiryMinutes() * 60 * 1000
  )
}

export function isPaymentStatus(
  status: string
): status is PaymentStatus {
  return paymentStatuses.includes(status as PaymentStatus)
}

export function normalizePaymentStatus(
  value: unknown
): PaymentStatus | null {
  const status = String(value ?? '')
    .trim()
    .toLowerCase()

  const aliases: Record<string, PaymentStatus> = {
    pending: 'pending',
    unpaid: 'pending',
    waiting: 'pending',
    waiting_payment: 'pending',
    paid: 'paid',
    success: 'paid',
    successful: 'paid',
    settlement: 'paid',
    settled: 'paid',
    capture: 'paid',
    captured: 'paid',
    completed: 'paid',
    complete: 'paid',
    failed: 'failed',
    failure: 'failed',
    fail: 'failed',
    denied: 'failed',
    deny: 'failed',
    expired: 'expired',
    expire: 'expired',
    cancelled: 'cancelled',
    canceled: 'cancelled',
    cancel: 'cancelled',
  }

  return aliases[status] || null
}

export function getPaymentStatusFromMidtrans(
  transactionStatus:
    | MidtransTransactionStatus
    | string
    | null
    | undefined,
  fraudStatus?: string | null
): PaymentStatus {
  const status = String(transactionStatus || 'pending')
    .trim()
    .toLowerCase()
  const fraud = String(fraudStatus || '')
    .trim()
    .toLowerCase()

  if (status === 'settlement') return 'paid'

  if (status === 'capture') {
    if (fraud === 'challenge') return 'pending'

    return fraud === 'deny' ? 'failed' : 'paid'
  }

  if (status === 'expire') return 'expired'

  if (status === 'deny' || status === 'failure') {
    return 'failed'
  }

  if (status === 'cancel') return 'cancelled'

  return 'pending'
}

function getMidtransStatusForPayment(
  paymentStatus: PaymentStatus
): MidtransTransactionStatus {
  if (paymentStatus === 'paid') return 'settlement'
  if (paymentStatus === 'failed') return 'failure'
  if (paymentStatus === 'expired') return 'expire'
  if (paymentStatus === 'cancelled') return 'cancel'

  return 'pending'
}

export function getOrderStateForPayment(
  paymentStatus: PaymentStatus,
  currentOrderStatus = 'waiting_payment'
) {
  if (paymentStatus === 'paid') {
    return {
      paymentStatus: 'paid',
      orderStatus: [
        'processing',
        'ready',
        'completed',
      ].includes(currentOrderStatus)
        ? currentOrderStatus
        : 'processing',
    }
  }

  if (paymentStatus === 'expired') {
    return {
      paymentStatus: 'expired',
      orderStatus: 'cancelled',
    }
  }

  if (paymentStatus === 'cancelled') {
    return {
      paymentStatus: 'cancelled',
      orderStatus: 'cancelled',
    }
  }

  if (paymentStatus === 'failed') {
    return {
      paymentStatus: 'failed',
      orderStatus: 'cancelled',
    }
  }

  return {
    paymentStatus: 'unpaid',
    orderStatus: 'waiting_payment',
  }
}

export async function expirePendingPayments() {
  const { data: eligibleOrders, error: orderError } = await db
    .from('orders')
    .select('id')
    .in('payment_status', ['unpaid', 'pending'])

  if (orderError) throw orderError

  const orderIds = (eligibleOrders || []).map(
    (order) => order.id
  )

  if (!orderIds.length) return 0

  const { data: expiredPayments, error: paymentError } =
    await db
      .from('payments')
      .select('id, order_id')
      .in('order_id', orderIds)
      .eq('transaction_status', 'pending')
      .not('expiry_time', 'is', null)
      .lte('expiry_time', new Date().toISOString())

  if (paymentError) throw paymentError

  if (!expiredPayments?.length) return 0

  const { error: updatePaymentsError } = await db
    .from('payments')
    .update({
      transaction_status: 'expire',
      paid_at: null,
      settlement_time: null,
    })
    .in(
      'id',
      expiredPayments.map((payment) => payment.id)
    )

  if (updatePaymentsError) throw updatePaymentsError

  const { error: updateOrdersError } = await db
    .from('orders')
    .update({
      payment_status: 'expired',
      order_status: 'cancelled',
      paid_at: null,
    })
    .in(
      'id',
      expiredPayments.map((payment) => payment.order_id)
    )
    .in('payment_status', ['unpaid', 'pending'])

  if (updateOrdersError) throw updateOrdersError

  return expiredPayments.length
}

async function findPayment(reference: PaymentReference) {
  if (reference.paymentId) {
    const { data, error } = await db
      .from('payments')
      .select('id, order_id, transaction_status, settlement_time, paid_at')
      .eq('id', reference.paymentId)
      .maybeSingle()

    if (error) throw error

    return data as PaymentRow | null
  }

  if (reference.transactionId) {
    const { data, error } = await db
      .from('payments')
      .select('id, order_id, transaction_status, settlement_time, paid_at')
      .eq('transaction_id', reference.transactionId)
      .maybeSingle()

    if (error) throw error

    return data as PaymentRow | null
  }

  if (reference.invoiceNumber) {
    const { data: order, error: orderError } = await db
      .from('orders')
      .select('id')
      .eq('invoice_number', reference.invoiceNumber)
      .maybeSingle()

    if (orderError) throw orderError
    if (!order) return null

    const { data, error } = await db
      .from('payments')
      .select('id, order_id, transaction_status, settlement_time, paid_at')
      .eq('order_id', order.id)
      .maybeSingle()

    if (error) throw error

    return data as PaymentRow | null
  }

  throw new PaymentStatusError(
    'Payment reference is required'
  )
}

export async function updatePaymentStatus(
  reference: PaymentReference,
  status: PaymentStatus
) {
  const payment = await findPayment(reference)

  if (!payment) {
    throw new PaymentStatusError('Payment not found', 404)
  }

  const { data: order, error: orderError } = await db
    .from('orders')
    .select('id, order_status')
    .eq('id', payment.order_id)
    .maybeSingle()

  if (orderError) throw orderError

  if (!order) {
    throw new PaymentStatusError('Order not found', 404)
  }

  const orderState = getOrderStateForPayment(
    status,
    order.order_status
  )
  const transactionStatus = getMidtransStatusForPayment(status)
  const timestamp = new Date().toISOString()
  const paidAt =
    status === 'paid'
      ? payment.paid_at || timestamp
      : null
  const settlementTime =
    status === 'paid'
      ? payment.settlement_time || timestamp
      : null

  const { error: paymentUpdateError } = await db
    .from('payments')
    .update({
      transaction_status: transactionStatus,
      settlement_time: settlementTime,
      paid_at: paidAt,
    })
    .eq('id', payment.id)

  if (paymentUpdateError) throw paymentUpdateError

  const { error: orderUpdateError } = await db
    .from('orders')
    .update({
      payment_status: orderState.paymentStatus,
      order_status: orderState.orderStatus,
      paid_at: paidAt,
    })
    .eq('id', payment.order_id)

  if (orderUpdateError) throw orderUpdateError

  return {
    payment: {
      id: payment.id,
      order_id: payment.order_id,
      status,
      transaction_status: transactionStatus,
    },
    order: {
      id: payment.order_id,
      payment_status: orderState.paymentStatus,
      order_status: orderState.orderStatus,
    },
  }
}
