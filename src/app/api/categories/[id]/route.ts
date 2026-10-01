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

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function PUT(
  request: Request,
  { params }: Params
) {
  const authError = requireAdmin(request)

  if (authError) return authError

  try {
    const { id } = await params

    const body = await request.json()

    await db.query(
      `
      UPDATE categories
      SET name = ?
      WHERE id = ?
      `,
      [body.name, id]
    )

    return NextResponse.json({
      message: 'Category updated',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update category' },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: Request,
  { params }: Params
) {
  const authError = requireAdmin(request)

  if (authError) return authError

  try {
    const { id } = await params

    await db.query(
      `
      DELETE FROM categories
      WHERE id = ?
      `,
      [id]
    )

    return NextResponse.json({
      message: 'Category deleted',
    })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
