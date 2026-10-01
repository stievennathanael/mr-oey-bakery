import { NextResponse } from 'next/server'
import type { ResultSetHeader } from 'mysql2'
import { db } from '@/lib/db'
import {
  getAuthUser,
  isAdmin,
} from '@/lib/auth'
import { expirePendingPayments } from '@/lib/payment-status'

type Params = {
  params: Promise<{
    id: string
  }>
}

const statuses = [
  'ready',
  'completed',
] as const

type OrderStatus =
  (typeof statuses)[number]

function isOrderStatus(
  status: string
): status is OrderStatus {
  return statuses.includes(
    status as OrderStatus
  )
}

export async function PATCH(
  req: Request,
  { params }: Params
) {
  const user = getAuthUser(req)

  if (!user || !isAdmin(user)) {
    return NextResponse.json(
      {
        message: 'Forbidden',
      },
      {
        status: user ? 403 : 401,
      }
    )
  }

  try {
    const { id } = await params
    const orderId = Number(id)
    const body = await req.json()
    const orderStatus = String(
      body.order_status || ''
    )
      .trim()
      .toLowerCase()

    if (
      !Number.isInteger(orderId) ||
      orderId <= 0
    ) {
      return NextResponse.json(
        {
          message: 'Invalid order',
        },
        {
          status: 400,
        }
      )
    }

    if (!isOrderStatus(orderStatus)) {
      return NextResponse.json(
        {
          message: 'Invalid order status',
        },
        {
          status: 400,
        }
      )
    }

    await expirePendingPayments()

    const [orderRows] = await db.query(
      `
      SELECT payment_status, order_status
      FROM orders
      WHERE id = ?
      LIMIT 1
      `,
      [orderId]
    )

    const order = (
      orderRows as Array<{
        payment_status: string
        order_status: string
      }>
    )[0]

    if (!order) {
      return NextResponse.json(
        {
          message: 'Order not found',
        },
        {
          status: 404,
        }
      )
    }

    if (
      order.payment_status !== 'paid' ||
      (order.order_status !== 'processing' &&
        order.order_status !== 'ready')
    ) {
      return NextResponse.json(
        {
          message:
            'Status order hanya dapat diubah ketika payment paid dan order masih processing atau ready.',
        },
        {
          status: 409,
        }
      )
    }

    const [result] =
      await db.query<ResultSetHeader>(
        `
        UPDATE orders
        SET order_status = ?
        WHERE id = ?
        `,
        [
          orderStatus,
          orderId,
        ]
      )

    if (result.affectedRows === 0) {
      return NextResponse.json(
        {
          message: 'Order not found',
        },
        {
          status: 404,
        }
      )
    }

    return NextResponse.json({
      message: 'Order updated',
      order: {
        id: orderId,
        order_status: orderStatus,
      },
    })
  } catch (error) {
    console.error('UPDATE ORDER ERROR:', error)

    return NextResponse.json(
      {
        message: 'Failed to update order',
      },
      {
        status: 500,
      }
    )
  }
}
