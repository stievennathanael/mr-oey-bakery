import { NextResponse } from 'next/server'
import type { RowDataPacket } from 'mysql2'
import { db } from '@/lib/db'
import {
  getAuthUser,
  isAdmin,
} from '@/lib/auth'

type OrderNotificationCountRow =
  RowDataPacket & {
    total: string | number
  }

export async function GET(req: Request) {
  const user = getAuthUser(req)

  if (!user || !isAdmin(user)) {
    return NextResponse.json(
      {
        message: user ? 'Forbidden' : 'Unauthorized',
      },
      {
        status: user ? 403 : 401,
      }
    )
  }

  try {
    const [rows] =
      await db.query<OrderNotificationCountRow[]>(
        `
        SELECT COUNT(*) as total
        FROM orders
        WHERE LOWER(payment_status) = 'paid'
          AND LOWER(COALESCE(order_status, '')) <> 'completed'
        `
      )

    const count = Number(rows[0]?.total || 0)

    return NextResponse.json({
      count: Number.isFinite(count) ? count : 0,
    })
  } catch (error) {
    console.error(
      'GET ORDER NOTIFICATION COUNT ERROR:',
      error
    )

    return NextResponse.json(
      {
        message:
          'Failed to fetch order notification count',
      },
      {
        status: 500,
      }
    )
  }
}
