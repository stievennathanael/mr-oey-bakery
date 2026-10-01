import type {
  ResultSetHeader,
  RowDataPacket,
} from 'mysql2'
import type {
  Pool,
  PoolConnection,
} from 'mysql2/promise'
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

type Queryable = Pool | PoolConnection

type PaymentRow = RowDataPacket & {
  id: number
  order_id: number
  transaction_status: string
  order_status: string
}

const DEFAULT_PAYMENT_EXPIRY_MINUTES = 15

export class PaymentStatusError extends Error {
  statusCode: number

  constructor(
    message: string,
    statusCode = 400
  ) {
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

  if (
    !Number.isFinite(minutes) ||
    minutes <= 0
  ) {
    return DEFAULT_PAYMENT_EXPIRY_MINUTES
  }

  return Math.floor(minutes)
}

export function getPaymentExpiresAt(
  value: string | Date | null | undefined
) {
  if (!value) {
    return null
  }

  const date =
    value instanceof Date ? value : new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return date.toISOString()
}

export function createPaymentExpiryDate(
  from = new Date()
) {
  return new Date(
    from.getTime() +
      getPaymentExpiryMinutes() * 60 * 1000
  )
}

export function isPaymentStatus(
  status: string
): status is PaymentStatus {
  return paymentStatuses.includes(
    status as PaymentStatus
  )
}

export function normalizePaymentStatus(
  value: unknown
): PaymentStatus | null {
  const status = String(value ?? '')
    .trim()
    .toLowerCase()

  const aliases: Record<
    string,
    PaymentStatus
  > = {
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
  const status = String(
    transactionStatus || 'pending'
  )
    .trim()
    .toLowerCase()
  const fraud = String(fraudStatus || '')
    .trim()
    .toLowerCase()

  if (status === 'settlement') {
    return 'paid'
  }

  if (status === 'capture') {
    if (fraud === 'challenge') {
      return 'pending'
    }

    return fraud === 'deny'
      ? 'failed'
      : 'paid'
  }

  if (status === 'expire') {
    return 'expired'
  }

  if (
    status === 'deny' ||
    status === 'failure'
  ) {
    return 'failed'
  }

  if (status === 'cancel') {
    return 'cancelled'
  }

  return 'pending'
}

function getMidtransStatusForPayment(
  paymentStatus: PaymentStatus
): MidtransTransactionStatus {
  if (paymentStatus === 'paid') {
    return 'settlement'
  }

  if (paymentStatus === 'failed') {
    return 'failure'
  }

  if (paymentStatus === 'expired') {
    return 'expire'
  }

  if (paymentStatus === 'cancelled') {
    return 'cancel'
  }

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

export async function expirePendingPayments(
  connection: Queryable = db
) {
  const [result] =
    await connection.query<ResultSetHeader>(
      `
      UPDATE payments
      INNER JOIN orders
        ON payments.order_id = orders.id
      SET
        payments.transaction_status = 'expire',
        payments.paid_at = NULL,
        payments.settlement_time = NULL,
        orders.payment_status = 'expired',
        orders.order_status = 'cancelled',
        orders.paid_at = NULL
      WHERE payments.transaction_status = 'pending'
        AND orders.payment_status IN ('unpaid', 'pending')
        AND payments.expiry_time IS NOT NULL
        AND payments.expiry_time <= CURRENT_TIMESTAMP
      `
    )

  return result.affectedRows
}

export async function updatePaymentStatus(
  connection: PoolConnection,
  reference: PaymentReference,
  status: PaymentStatus
) {
  const clauses: string[] = []
  const values: Array<number | string> = []

  if (reference.paymentId) {
    clauses.push('payments.id = ?')
    values.push(reference.paymentId)
  }

  if (reference.transactionId) {
    clauses.push('payments.transaction_id = ?')
    values.push(reference.transactionId)
  }

  if (reference.invoiceNumber) {
    clauses.push('orders.invoice_number = ?')
    values.push(reference.invoiceNumber)
  }

  if (clauses.length === 0) {
    throw new PaymentStatusError(
      'Payment reference is required'
    )
  }

  const [rows] =
    await connection.query<PaymentRow[]>(
      `
      SELECT
        payments.id,
        payments.order_id,
        payments.transaction_status,
        orders.order_status
      FROM payments
      INNER JOIN orders
        ON payments.order_id = orders.id
      WHERE ${clauses.join(' OR ')}
      LIMIT 1
      FOR UPDATE
      `,
      values
    )

  const payment = rows[0]

  if (!payment) {
    throw new PaymentStatusError(
      'Payment not found',
      404
    )
  }

  const orderState = getOrderStateForPayment(
    status,
    payment.order_status
  )
  const transactionStatus =
    getMidtransStatusForPayment(status)
  const paidAtSql =
    status === 'paid'
      ? 'COALESCE(paid_at, CURRENT_TIMESTAMP)'
      : 'NULL'
  const settlementSql =
    status === 'paid'
      ? 'COALESCE(settlement_time, CURRENT_TIMESTAMP)'
      : 'NULL'

  await connection.query<ResultSetHeader>(
    `
    UPDATE payments
    SET
      transaction_status = ?,
      settlement_time = ${settlementSql},
      paid_at = ${paidAtSql}
    WHERE id = ?
    `,
    [
      transactionStatus,
      payment.id,
    ]
  )

  await connection.query<ResultSetHeader>(
    `
    UPDATE orders
    SET
      payment_status = ?,
      order_status = ?,
      paid_at = ${paidAtSql}
    WHERE id = ?
    `,
    [
      orderState.paymentStatus,
      orderState.orderStatus,
      payment.order_id,
    ]
  )

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
