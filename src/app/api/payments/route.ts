import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getAuthUser,
  isAdmin,
} from '@/lib/auth'
import {
  expirePendingPayments,
  getPaymentExpiresAt,
  getPaymentStatusFromMidtrans,
} from '@/lib/payment-status'
import { syncPendingPaymentsWithMidtrans } from '@/lib/midtrans-sync'

type OrderRow = {
  id: number
  user_id: number
  invoice_number: string
}

type UserRow = {
  id: number
  name: string
  email: string
}

type PaymentRow = {
  id: number
  order_id: number
  payment_provider: string
  payment_type: string | null
  transaction_id: string | null
  amount: string | number
  transaction_status: string
  settlement_time: string | null
  paid_at: string | null
  expiry_time: string | Date | null
  created_at: string | Date
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
      .select('id, user_id, invoice_number')

    if (!admin) {
      orderQuery = orderQuery.eq('user_id', user.id)
    }

    const { data: orders, error: orderError } = await orderQuery

    if (orderError) throw orderError

    const orderIds = (orders || []).map((order) => order.id)

    if (!orderIds.length) return NextResponse.json([])

    const userIds = [
      ...new Set((orders || []).map((order) => order.user_id)),
    ]
    const [paymentsResult, usersResult] = await Promise.all([
      db
        .from('payments')
        .select(
          `
            id,
            order_id,
            payment_provider,
            payment_type,
            transaction_id,
            amount,
            transaction_status,
            settlement_time,
            paid_at,
            expiry_time,
            created_at
          `
        )
        .in('order_id', orderIds)
        .order('created_at', { ascending: false }),
      db
        .from('users')
        .select('id, name, email')
        .in('id', userIds),
    ])

    if (paymentsResult.error) throw paymentsResult.error
    if (usersResult.error) throw usersResult.error

    const ordersById = new Map(
      ((orders || []) as OrderRow[]).map((order) => [
        order.id,
        order,
      ])
    )
    const usersById = new Map(
      ((usersResult.data || []) as UserRow[]).map((item) => [
        item.id,
        item,
      ])
    )

    const payments = ((paymentsResult.data || []) as PaymentRow[])
      .flatMap((payment) => {
        const order = ordersById.get(payment.order_id)

        if (!order) return []

        const customer = usersById.get(order.user_id)

        return [
          {
            ...payment,
            invoice_number: order.invoice_number,
            customer_name: customer?.name || null,
            customer_email: customer?.email || null,
            amount: Number(payment.amount),
            status: getPaymentStatusFromMidtrans(
              payment.transaction_status
            ),
            expires_at: getPaymentExpiresAt(
              payment.expiry_time
            ),
          },
        ]
      })

    return NextResponse.json(payments)
  } catch (error) {
    console.error('GET PAYMENTS ERROR:', error)

    return NextResponse.json(
      { message: 'Failed to fetch payments' },
      { status: 500 }
    )
  }
}
