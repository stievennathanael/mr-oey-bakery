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
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
}

type UserRow = {
  id: number
  name: string
  email: string
  phone: string | null
}

type LocationRow = { id: number; name: string }

type PaymentRow = {
  id: number
  order_id: number
  transaction_id: string | null
  payment_provider: string | null
  payment_type: string | null
  transaction_status: string | null
  payment_url: string | null
  snap_token: string | null
  expiry_time: string | Date | null
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
      { message: 'Unauthorized' },
      { status: 401 }
    )
  }

  try {
    const admin = isAdmin(user)

    await syncPendingPaymentsWithMidtrans({
      userId: admin ? undefined : user.id,
      limit: admin ? 25 : 10,
    })
    await expirePendingPayments()

    let orderQuery = db
      .from('orders')
      .select(
        `
          id,
          user_id,
          location_id,
          invoice_number,
          total_price,
          payment_method,
          payment_status,
          order_status,
          paid_at,
          created_at,
          updated_at,
          customer_name,
          customer_email,
          customer_phone
        `
      )
      .order('created_at', { ascending: false })

    if (!admin) {
      orderQuery = orderQuery.eq('user_id', user.id)
    }

    const { data: orderRows, error: ordersError } =
      await orderQuery

    if (ordersError) throw ordersError

    const orders = (orderRows || []) as OrderRow[]

    if (!orders.length) return NextResponse.json([])

    const orderIds = orders.map((order) => order.id)
    const userIds = [...new Set(orders.map((order) => order.user_id))]
    const locationIds = [
      ...new Set(
        orders.flatMap((order) =>
          order.location_id ? [order.location_id] : []
        )
      ),
    ]

    const [usersResult, locationsResult, paymentsResult, itemsResult] =
      await Promise.all([
        db
          .from('users')
          .select('id, name, email, phone')
          .in('id', userIds),
        locationIds.length
          ? db
              .from('locations')
              .select('id, name')
              .in('id', locationIds)
          : Promise.resolve({ data: [], error: null }),
        db
          .from('payments')
          .select(
            `
              id,
              order_id,
              transaction_id,
              payment_provider,
              payment_type,
              transaction_status,
              payment_url,
              snap_token,
              expiry_time
            `
          )
          .in('order_id', orderIds),
        db
          .from('order_items')
          .select('*')
          .in('order_id', orderIds)
          .order('id', { ascending: true }),
      ])

    if (usersResult.error) throw usersResult.error
    if (locationsResult.error) throw locationsResult.error
    if (paymentsResult.error) throw paymentsResult.error
    if (itemsResult.error) throw itemsResult.error

    const usersById = new Map(
      ((usersResult.data || []) as UserRow[]).map((item) => [
        item.id,
        item,
      ])
    )
    const locationsById = new Map(
      ((locationsResult.data || []) as LocationRow[]).map(
        (item) => [item.id, item]
      )
    )
    const paymentsByOrderId = new Map(
      ((paymentsResult.data || []) as PaymentRow[]).map(
        (item) => [item.order_id, item]
      )
    )
    const items = (itemsResult.data || []) as OrderItemRow[]

    const result = orders.map((order) => {
      const customer = usersById.get(order.user_id)
      const location = order.location_id
        ? locationsById.get(order.location_id)
        : null
      const payment = paymentsByOrderId.get(order.id)

      return {
        ...order,
        total_price: Number(order.total_price),
        customer_name: order.customer_name || customer?.name || null,
        customer_email:
          order.customer_email || customer?.email || null,
        customer_phone:
          order.customer_phone || customer?.phone || null,
        location_name: location?.name || null,
        payment_id: payment?.id || null,
        transaction_id: payment?.transaction_id || null,
        payment_provider:
          payment?.payment_provider || null,
        payment_type: payment?.payment_type || null,
        payment_transaction_status:
          payment?.transaction_status || null,
        payment_url: payment?.payment_url || null,
        snap_token: payment?.snap_token || null,
        payment_expiry_time:
          payment?.expiry_time || null,
        payment_expires_at: getPaymentExpiresAt(
          payment?.expiry_time
        ),
        midtrans_client_key: getMidtransClientKey(),
        midtrans_snap_js_url: getMidtransSnapJsUrl(),
        items: items
          .filter((item) => item.order_id === order.id)
          .map((item) => ({
            ...item,
            product_price: Number(item.product_price),
            subtotal: Number(item.subtotal),
          })),
      }
    })

    return NextResponse.json(result)
  } catch (error) {
    console.error('GET ORDERS ERROR:', error)

    return NextResponse.json(
      { message: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}
