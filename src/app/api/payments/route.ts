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
  invoice_number: string
  customer_name: string
  customer_email: string
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

    const [rows] = await db.query(
      `
      SELECT
        payments.id,
        payments.order_id,
        payments.payment_provider,
        payments.payment_type,
        payments.transaction_id,
        payments.amount,
        payments.transaction_status,
        payments.settlement_time,
        payments.paid_at,
        payments.expiry_time,
        payments.created_at,
        orders.invoice_number,
        users.name as customer_name,
        users.email as customer_email
      FROM payments
      INNER JOIN orders
        ON payments.order_id = orders.id
      INNER JOIN users
        ON orders.user_id = users.id
      ${where}
      ORDER BY payments.created_at DESC
      `,
      params
    )

    const payments = (rows as PaymentRow[]).map(
      (payment) => ({
        ...payment,
        amount: Number(payment.amount),
        status: getPaymentStatusFromMidtrans(
          payment.transaction_status
        ),
        expires_at: getPaymentExpiresAt(
          payment.expiry_time
        ),
      })
    )

    return NextResponse.json(payments)
  } catch (error) {
    console.error('GET PAYMENTS ERROR:', error)

    return NextResponse.json(
      {
        message: 'Failed to fetch payments',
      },
      {
        status: 500,
      }
    )
  }
}
