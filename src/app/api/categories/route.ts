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
    const { data, error } = await db
      .from('categories')
      .select('*')
      .order('id', { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
  } catch (error) {
    console.error('GET CATEGORIES ERROR:', error)

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

    const { error } = await db
      .from('categories')
      .insert({ name: body.name })

    if (error) throw error

    return NextResponse.json({
      message: 'Category created',
    })
  } catch (error) {
    console.error('CREATE CATEGORY ERROR:', error)

    return NextResponse.json(
      { error: 'Failed to create category' },
      { status: 500 }
    )
  }
}
