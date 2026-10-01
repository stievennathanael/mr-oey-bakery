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
        message: 'Forbidden',
      },
      {
        status: user ? 403 : 401,
      }
    )
  }

  try {
    const [rows] = await db.query(`
      SELECT
        id,
        name,
        email,
        phone,
        role
      FROM users
      ORDER BY id DESC
    `)

    return NextResponse.json(rows)
  } catch (error) {
    console.error('GET USERS ERROR:', error)

    return NextResponse.json(
      {
        message: 'Failed to fetch users',
      },
      {
        status: 500,
      }
    )
  }
}
