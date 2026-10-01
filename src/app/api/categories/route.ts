import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getAuthUser,
  isAdmin,
} from '@/lib/auth'

function requireAdmin(req: Request) {
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

  return null
}

export async function GET() {
  try {
    const [rows] = await db.query(`
      SELECT *
      FROM categories
      ORDER BY id ASC
    `)

    return NextResponse.json(rows)
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch categories' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: Request
) {
  const authError = requireAdmin(request)

  if (authError) return authError

  try {
    const body = await request.json()

    await db.query(
      `
      INSERT INTO categories(name)
      VALUES(?)
      `,
      [body.name]
    )

    return NextResponse.json({
      message: 'Category created',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
