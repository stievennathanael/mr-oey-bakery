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
    const { data, error } = await db
      .from('locations')
      .select('*')
      .order('id', { ascending: true })

    if (error) throw error

    return NextResponse.json(data)
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

    const { error } = await db
      .from('locations')
      .insert({ name, address, map_url })

    if (error) throw error

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
