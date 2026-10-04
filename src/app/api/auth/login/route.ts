import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'
import { signAuthToken } from '@/lib/auth'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      email,
      password,
    } = body

    if (
      !email?.trim() ||
      !password?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Alamat Email dan Password wajib diisi',
        },
        {
          status: 400,
        }
      )
    }

    const { data: rows, error } = await db
      .from('users')
      .select('*')
      .eq(
        'email',
        email.trim().toLowerCase()
      )
      .limit(1)

    if (error) throw error

    if ((rows || []).length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Alamat Email tidak ditemukan',
        },
        {
          status: 404,
        }
      )
    }

    const user = rows[0]

    const passwordMatch =
      await bcrypt.compare(
        password,
        user.password
      )

    if (!passwordMatch) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Password salah',
        },
        {
          status: 401,
        }
      )
    }

    const token = signAuthToken({
      id: user.id,
      role: user.role,
    })

    return NextResponse.json({
      success: true,
      message:
        'Login successful',

      token,

      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
      },
    })
  } catch (error) {
    console.error(error)

    return NextResponse.json(
      {
        success: false,
        message:
          'Internal Server Error',
      },
      {
        status: 500,
      }
    )
  }
}
