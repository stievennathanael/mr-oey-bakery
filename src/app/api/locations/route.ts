import { NextRequest, NextResponse } from 'next/server'
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
      FROM locations
      ORDER BY id ASC
    `)

    return NextResponse.json(rows)
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        message: 'Failed to fetch locations',
      },
      {
        status: 500,
      }
    )
  }
}

export async function POST(
  request: NextRequest
) {
  const authError = requireAdmin(request)

  if (authError) return authError

  try {
    const body = await request.json()

    const {
      name,
      address,
      map_url,
    } = body

    await db.query(
      `
      INSERT INTO locations (
        name,
        address,
        map_url
      )
      VALUES (?, ?, ?)
      `,
      [
        name,
        address,
        map_url,
      ]
    )

    return NextResponse.json({
      message:
        'Location created successfully',
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        message:
          'Failed to create location',
      },
      {
        status: 500,
      }
    )
  }
}
