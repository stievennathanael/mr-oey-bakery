import {
  createHash,
  timingSafeEqual,
} from 'crypto'
import { getPaymentExpiryMinutes } from '@/lib/payment-status'

export type MidtransTransactionStatus =
  | 'pending'
  | 'capture'
  | 'settlement'
  | 'deny'
  | 'cancel'
  | 'expire'
  | 'failure'

type SnapResponse = {
  token?: string
  redirect_url?: string
  status_code?: string
  status_message?: string
  error_messages?: string[]
}

export type MidtransTransactionStatusResponse =
  Record<string, unknown> & {
    order_id?: string
    transaction_id?: string
    transaction_status?: string
    fraud_status?: string
    payment_type?: string
    transaction_time?: string
    settlement_time?: string
    expiry_time?: string
    status_code?: string
    status_message?: string
    gross_amount?: string
    currency?: string
    error_messages?: string[]
  }

export type MidtransSnapItem = {
  id: number | string
  name: string
  price: number
  quantity: number
}

export type MidtransCustomer = {
  name: string
  email: string
  phone?: string | null
}

export class MidtransConfigurationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'MidtransConfigurationError'
  }
}

export class MidtransApiError extends Error {
  statusCode: number

  constructor(
    message: string,
    statusCode = 502
  ) {
    super(message)
    this.name = 'MidtransApiError'
    this.statusCode = statusCode
  }
}

function getServerKey() {
  return process.env.MIDTRANS_SERVER_KEY?.trim() || ''
}

export function isMidtransServerConfigured() {
  return Boolean(getServerKey())
}

export function getMidtransClientKey() {
  return process.env.MIDTRANS_CLIENT_KEY?.trim() || ''
}

export function isMidtransConfigured() {
  return Boolean(
    isMidtransServerConfigured() &&
      getMidtransClientKey()
  )
}

export function isMidtransProduction() {
  const value = (
    process.env.MIDTRANS_IS_PRODUCTION ||
    process.env.MIDTRANS_PRODUCTION ||
    ''
  )
    .trim()
    .toLowerCase()

  return value === 'true' || value === '1'
}

function getMidtransAppBaseUrl() {
  return isMidtransProduction()
    ? 'https://app.midtrans.com'
    : 'https://app.sandbox.midtrans.com'
}

function getMidtransApiBaseUrl() {
  return isMidtransProduction()
    ? 'https://api.midtrans.com'
    : 'https://api.sandbox.midtrans.com'
}

export function getMidtransSnapJsUrl() {
  return `${getMidtransAppBaseUrl()}/snap/snap.js`
}

function getSnapApiUrl() {
  return `${getMidtransAppBaseUrl()}/snap/v1/transactions`
}

function getTransactionStatusApiUrl(orderId: string) {
  return `${getMidtransApiBaseUrl()}/v2/${encodeURIComponent(
    orderId
  )}/status`
}

function getAuthorizationHeader() {
  return `Basic ${Buffer.from(
    `${getServerKey()}:`
  ).toString('base64')}`
}

function ensureServerKeyConfigured() {
  if (!getServerKey()) {
    throw new MidtransConfigurationError(
      'MIDTRANS_SERVER_KEY belum dikonfigurasi.'
    )
  }
}

function ensureConfigured() {
  ensureServerKeyConfigured()

  if (!getMidtransClientKey()) {
    throw new MidtransConfigurationError(
      'MIDTRANS_CLIENT_KEY belum dikonfigurasi.'
    )
  }
}

function toMidtransAmount(amount: number) {
  const value = Math.round(Number(amount || 0))

  if (!Number.isFinite(value) || value <= 0) {
    throw new MidtransApiError(
      'Nominal pembayaran Midtrans tidak valid.',
      400
    )
  }

  return value
}

function truncateText(value: string, length: number) {
  return value.trim().slice(0, length)
}

function createItemDetails(
  items: MidtransSnapItem[],
  grossAmount: number
)
{
  const itemDetails = items.map((item) => ({
    id: String(item.id),
    name:
      truncateText(item.name, 50) ||
      'Produk Mr. Oey Bakery',
    price: toMidtransAmount(item.price),
    quantity: Math.max(
      1,
      Math.floor(Number(item.quantity || 1))
    ),
  }))

  const itemTotal = itemDetails.reduce(
    (sum, item) =>
      sum + item.price * item.quantity,
    0
  )

  if (itemTotal !== grossAmount) {
    itemDetails.push({
      id: 'ADJUSTMENT',
      name: 'Pembulatan total',
      price: grossAmount - itemTotal,
      quantity: 1,
    })
  }

  return itemDetails
}

async function parseMidtransResponse<T>(
  response: Response
) {
  const text = await response.text()

  try {
    return JSON.parse(text) as T
  } catch {
    throw new MidtransApiError(
      text || 'Response Midtrans tidak bisa diproses.',
      response.status || 502
    )
  }
}

export async function createMidtransSnapTransaction({
  invoiceNumber,
  amount,
  customer,
  items,
}: {
  invoiceNumber: string
  amount: number
  customer: MidtransCustomer
  items: MidtransSnapItem[]
}) {
  ensureConfigured()

  const grossAmount = toMidtransAmount(amount)
  const bodyPayload = {
    transaction_details: {
      order_id: invoiceNumber,
      gross_amount: grossAmount,
    },
    item_details: createItemDetails(
      items,
      grossAmount
    ),
    customer_details: {
      first_name:
        truncateText(customer.name, 255) ||
        'Customer',
      email: customer.email,
      phone: customer.phone || undefined,
    },
    expiry: {
      unit: 'minute',
      duration: getPaymentExpiryMinutes(),
    },
  }

  const response = await fetch(getSnapApiUrl(), {
    method: 'POST',
    headers: {
      Authorization: getAuthorizationHeader(),
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(bodyPayload),
    cache: 'no-store',
  })

  const data =
    await parseMidtransResponse<SnapResponse>(
      response
    )

  if (!response.ok || !data.token) {
    throw new MidtransApiError(
      data.error_messages?.join(', ') ||
        data.status_message ||
        'Gagal membuat transaksi Midtrans Snap.',
      response.status || 502
    )
  }

  return {
    token: data.token,
    redirectUrl: data.redirect_url || '',
    rawResponse: data,
  }
}

export async function getMidtransTransactionStatus(
  orderId: string
) {
  const normalizedOrderId = orderId.trim()

  ensureServerKeyConfigured()

  if (!normalizedOrderId) {
    throw new MidtransApiError(
      'Order ID Midtrans tidak valid.',
      400
    )
  }

  const response = await fetch(
    getTransactionStatusApiUrl(normalizedOrderId),
    {
      method: 'GET',
      headers: {
        Authorization: getAuthorizationHeader(),
        Accept: 'application/json',
      },
      cache: 'no-store',
    }
  )

  const data =
    await parseMidtransResponse<MidtransTransactionStatusResponse>(
      response
    )

  if (!response.ok) {
    throw new MidtransApiError(
      data.error_messages?.join(', ') ||
        data.status_message ||
        'Gagal mengambil status transaksi Midtrans.',
      response.status || 502
    )
  }

  return data
}

function safeEquals(
  expected: string,
  actual: string
) {
  const expectedBuffer = Buffer.from(expected)
  const actualBuffer = Buffer.from(actual)

  return (
    expectedBuffer.length ===
      actualBuffer.length &&
    timingSafeEqual(expectedBuffer, actualBuffer)
  )
}

export function verifyMidtransSignature(
  notification: Record<string, unknown>
) {
  const serverKey = getServerKey()
  const signature = String(
    notification.signature_key || ''
  ).trim()
  const orderId = String(
    notification.order_id || ''
  ).trim()
  const statusCode = String(
    notification.status_code || ''
  ).trim()
  const grossAmount = String(
    notification.gross_amount || ''
  ).trim()

  if (
    !serverKey ||
    !signature ||
    !orderId ||
    !statusCode ||
    !grossAmount
  ) {
    return false
  }

  const expected = createHash('sha512')
    .update(
      `${orderId}${statusCode}${grossAmount}${serverKey}`
    )
    .digest('hex')

  return safeEquals(expected, signature)
}

export function normalizeMidtransTransactionStatus(
  value: unknown
): MidtransTransactionStatus | null {
  const status = String(value ?? '')
    .trim()
    .toLowerCase()

  if (status === 'expired') {
    return 'expire'
  }

  const statuses: MidtransTransactionStatus[] = [
    'pending',
    'capture',
    'settlement',
    'deny',
    'cancel',
    'expire',
    'failure',
  ]

  return statuses.includes(
    status as MidtransTransactionStatus
  )
    ? (status as MidtransTransactionStatus)
    : null
}
