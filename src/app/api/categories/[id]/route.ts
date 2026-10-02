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

    const { error } = await db
      .from('categories')
      .update({ name: body.name })
      .eq('id', Number(id))

    if (error) throw error

    return NextResponse.json({
      message: 'Category updated',
    })
  } catch (error) {
    console.error('UPDATE CATEGORY ERROR:', error)

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

    const { error } = await db
      .from('categories')
      .delete()
      .eq('id', Number(id))

    if (error) throw error

    return NextResponse.json({
      message: 'Category deleted',
    })
  } catch (error) {
    console.error('DELETE CATEGORY ERROR:', error)

    return NextResponse.json(
      { error: 'Failed to delete category' },
      { status: 500 }
    )
  }
}
