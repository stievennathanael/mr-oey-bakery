import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getAuthUser,
  isAdmin,
} from '@/lib/auth'
import {
  expirePendingPayments,
  getPaymentExpiresAt,
} from '@/lib/payment-status'
import {
  getMidtransClientKey,
  getMidtransSnapJsUrl,
} from '@/lib/midtrans'
import { syncPendingPaymentsWithMidtrans } from '@/lib/midtrans-sync'

type OrderRow = {
  id: number
  user_id: number
  location_id: number | null
  invoice_number: string
  total_price: string | number
  payment_method: string
  payment_status: string
  order_status: string
  paid_at: string | null
  created_at: string
  updated_at: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  location_name: string | null
  payment_id: number | null
  transaction_id: string | null
  payment_provider: string | null
  payment_type: string | null
  payment_transaction_status: string | null
  payment_url: string | null
  snap_token: string | null
  payment_expiry_time: string | Date | null
}

type OrderItemRow = {
  id: number
  order_id: number
  product_id: number
  quantity: number
  product_name: string
  product_price: string | number
  subtotal: string | number
}

export async function GET(req: Request) {
  const user = getAuthUser(req)

  if (!user) {
    return NextResponse.json(
      {
        message: 'Unauthorized',
      },
      {
        status: 401,
      }
    )
  }

  try {
    const admin = isAdmin(user)

    await syncPendingPaymentsWithMidtrans({
      userId: admin ? undefined : user.id,
      limit: admin ? 25 : 10,
    })
    await expirePendingPayments()

    const params: number[] = []
    let where = ''

    if (!admin) {
      where = 'WHERE orders.user_id = ?'
      params.push(user.id)
    }

    const [orderRows] = await db.query(
      `
      SELECT
        orders.id,
        orders.user_id,
        orders.location_id,
        orders.invoice_number,
        orders.total_price,
        orders.payment_method,
        orders.payment_status,
        orders.order_status,
        orders.paid_at,
        orders.created_at,
        orders.updated_at,
        COALESCE(orders.customer_name, users.name) as customer_name,
        COALESCE(orders.customer_email, users.email) as customer_email,
        COALESCE(orders.customer_phone, users.phone) as customer_phone,
        locations.name as location_name,
        payments.id as payment_id,
        payments.transaction_id,
        payments.payment_provider,
        payments.payment_type,
        payments.transaction_status as payment_transaction_status,
        payments.payment_url,
        payments.snap_token,
        payments.expiry_time as payment_expiry_time
      FROM orders
      INNER JOIN users
        ON orders.user_id = users.id
      LEFT JOIN locations
        ON orders.location_id = locations.id
      LEFT JOIN payments
        ON payments.order_id = orders.id
      ${where}
      ORDER BY orders.created_at DESC
      `,
      params
    )

    const orders = orderRows as OrderRow[]

    if (orders.length === 0) {
      return NextResponse.json([])
    }

    const orderIds = orders.map(
      (order) => order.id
    )

    const placeholders = orderIds
      .map(() => '?')
      .join(',')

    const [itemRows] = await db.query(
      `
      SELECT *
      FROM order_items
      WHERE order_id IN (${placeholders})
      ORDER BY id ASC
      `,
      orderIds
    )

    const items = itemRows as OrderItemRow[]

    const result = orders.map((order) => ({
      ...order,
      total_price: Number(order.total_price),
      payment_expires_at: getPaymentExpiresAt(
        order.payment_expiry_time
      ),
      midtrans_client_key:
        getMidtransClientKey(),
      midtrans_snap_js_url:
        getMidtransSnapJsUrl(),
      items: items
        .filter(
          (item) =>
            item.order_id === order.id
        )
        .map((item) => ({
          ...item,
          product_price: Number(
            item.product_price
          ),
          subtotal: Number(item.subtotal),
        })),
    }))

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET ORDERS ERROR:', error)

    return NextResponse.json(
      {
        message: 'Failed to fetch orders',
      },
      {
        status: 500,
      }
    )
  }
}
