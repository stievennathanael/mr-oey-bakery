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
            'Email and password are required',
        },
        {
          status: 400,
        }
      )
    }

    const [rows]: any =
      await db.query(
        `
        SELECT *
        FROM users
        WHERE email = ?
      `,
        [
          email
            .trim()
            .toLowerCase(),
        ]
      )

    if (rows.length === 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Email not found',
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
            'Wrong password',
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
