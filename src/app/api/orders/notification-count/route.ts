import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getAuthUser,
  isAdmin,
} from '@/lib/auth'

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
    const { count, error } = await db
      .from('orders')
      .select('*', { count: 'exact', head: true })
      .eq('payment_status', 'paid')
      .neq('order_status', 'completed')

    if (error) throw error

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
