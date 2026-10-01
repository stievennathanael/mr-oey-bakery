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

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function PUT(
  request: NextRequest,
  { params }: Params
) {
  const authError = requireAdmin(request)

  if (authError) return authError

  try {
    const { id } = await params

    const body = await request.json()

    const {
      name,
      address,
      map_url,
    } = body

    await db.query(
      `
      UPDATE locations
      SET
        name = ?,
        address = ?,
        map_url = ?
      WHERE id = ?
      `,
      [
        name,
        address,
        map_url,
        id,
      ]
    )

    return NextResponse.json({
      message:
        'Location updated successfully',
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        message:
          'Failed to update location',
      },
      {
        status: 500,
      }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: Params
) {
  const authError = requireAdmin(request)

  if (authError) return authError

  try {
    const { id } = await params

    await db.query(
      `
      DELETE FROM locations
      WHERE id = ?
      `,
      [id]
    )

    return NextResponse.json({
      message:
        'Location deleted successfully',
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        message:
          'Failed to delete location',
      },
      {
        status: 500,
      }
    )
  }
}
