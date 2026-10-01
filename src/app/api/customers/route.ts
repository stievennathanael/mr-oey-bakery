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
    const [rows] = await db.query(
      `
      SELECT
        id,
        name,
        email,
        phone,
        role
      FROM users
      WHERE role = ?
      ORDER BY id DESC
      `,
      ['customer']
    )

    return NextResponse.json(rows)
  } catch (error) {
    console.error(
      'GET CUSTOMERS ERROR:',
      error
    )

    return NextResponse.json(
      {
        message:
          'Failed to fetch customers',
      },
      {
        status: 500,
      }
    )
  }
}