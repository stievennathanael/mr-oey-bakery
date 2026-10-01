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
  isPaymentStatus,
  PaymentStatusError,
  updatePaymentStatus,
} from '@/lib/payment-status'
import {
  getMidtransClientKey,
  getMidtransSnapJsUrl,
} from '@/lib/midtrans'
import { syncPaymentWithMidtrans } from '@/lib/midtrans-sync'

type Params = {
  params: Promise<{
    id: string
  }>
}

type PaymentDetailRow = {
  id: number
  order_id: number
  payment_provider: string
  payment_type: string | null
  transaction_id: string | null
  snap_token: string | null
  payment_url: string | null
  amount: number
  transaction_status: string
  settlement_time: string | null
  paid_at: string | null
  expiry_time: string | Date | null
  created_at: string | Date
  user_id: number
  payment_status: string
  order_status: string
}

async function getPaymentDetail(paymentId: number) {
  const [rows] = await db.query(
    `
    SELECT
      payments.id,
      payments.order_id,
      payments.payment_provider,
      payments.payment_type,
      payments.transaction_id,
      payments.snap_token,
      payments.payment_url,
      payments.amount,
      payments.transaction_status,
      payments.settlement_time,
      payments.paid_at,
      payments.expiry_time,
      payments.created_at,
      orders.user_id,
      orders.payment_status,
      orders.order_status
    FROM payments
    INNER JOIN orders
      ON payments.order_id = orders.id
    WHERE payments.id = ?
    LIMIT 1
    `,
    [paymentId]
  )

  return (rows as PaymentDetailRow[])[0] || null
}

export async function PATCH(
  req: Request,
  { params }: Params
) {
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

  if (!isAdmin(user)) {
    return NextResponse.json(
      {
        message:
          'Payment status can only be updated by admin.',
      },
      {
        status: 403,
      }
    )
  }

  const connection =
    await db.getConnection()

  try {
    const { id } = await params
    const paymentId = Number(id)
    const body = await req.json()
    const status = String(
      body.status || 'paid'
    )
      .trim()
      .toLowerCase()

    if (
      !Number.isInteger(paymentId) ||
      paymentId <= 0
    ) {
      return NextResponse.json(
        {
          message: 'Invalid payment',
        },
        {
          status: 400,
        }
      )
    }

    if (!isPaymentStatus(status)) {
      return NextResponse.json(
        {
          message: 'Invalid payment status',
        },
        {
          status: 400,
        }
      )
    }

    await expirePendingPayments(connection)
    await connection.beginTransaction()

    const result = await updatePaymentStatus(
      connection,
      {
        paymentId,
      },
      status
    )

    await connection.commit()

    return NextResponse.json({
      message: 'Payment updated',
      ...result,
    })
  } catch (error) {
    await connection.rollback()

    if (error instanceof PaymentStatusError) {
      return NextResponse.json(
        {
          message: error.message,
        },
        {
          status: error.statusCode,
        }
      )
    }

    console.error('UPDATE PAYMENT ERROR:', error)

    return NextResponse.json(
      {
        message: 'Failed to update payment',
      },
      {
        status: 500,
      }
    )
  } finally {
    connection.release()
  }
}

export async function GET(
  req: Request,
  { params }: Params
) {
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
    const { id } = await params
    const paymentId = Number(id)

    if (
      !Number.isInteger(paymentId) ||
      paymentId <= 0
    ) {
      return NextResponse.json(
        {
          message: 'Invalid payment',
        },
        {
          status: 400,
        }
      )
    }

    let payment =
      await getPaymentDetail(paymentId)

    if (!payment) {
      return NextResponse.json(
        {
          message: 'Payment not found',
        },
        {
          status: 404,
        }
      )
    }

    if (
      !isAdmin(user) &&
      payment.user_id !== user.id
    ) {
      return NextResponse.json(
        {
          message: 'Forbidden',
        },
        {
          status: 403,
        }
      )
    }

    if (
      payment.payment_provider === 'Midtrans' &&
      (payment.transaction_status ===
        'pending' ||
        payment.payment_status === 'unpaid' ||
        payment.payment_status === 'pending')
    ) {
      await syncPaymentWithMidtrans(paymentId)
    }

    await expirePendingPayments()
    payment =
      (await getPaymentDetail(paymentId)) ||
      payment

    const status = getPaymentStatusFromMidtrans(
      payment.transaction_status
    )

    return NextResponse.json({
      payment: {
        id: payment.id,
        order_id: payment.order_id,
        payment_provider:
          payment.payment_provider,
        payment_type: payment.payment_type,
        transaction_id: payment.transaction_id,
        snap_token: payment.snap_token,
        payment_url: payment.payment_url,
        amount: Number(payment.amount),
        status,
        transaction_status:
          payment.transaction_status,
        settlement_time:
          payment.settlement_time,
        paid_at: payment.paid_at,
        expires_at: getPaymentExpiresAt(
          payment.expiry_time
        ),
        client_key: getMidtransClientKey(),
        snap_js_url: getMidtransSnapJsUrl(),
      },
      order: {
        id: payment.order_id,
        payment_status:
          payment.payment_status,
        order_status: payment.order_status,
      },
    })
  } catch (error) {
    console.error('GET PAYMENT ERROR:', error)

    return NextResponse.json(
      {
        message: 'Failed to fetch payment',
      },
      {
        status: 500,
      }
    )
  }
}
