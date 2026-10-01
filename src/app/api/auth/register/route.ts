import { NextResponse } from 'next/server'
import bcrypt from 'bcryptjs'
import { db } from '@/lib/db'

export async function POST(req: Request) {
  try {
    const body = await req.json()

    const {
      name,
      email,
      phone,
      password,
    } = body

    // ==========================
    // VALIDASI FIELD KOSONG
    // ==========================
    if (
      !name?.trim() ||
      !email?.trim() ||
      !phone?.trim() ||
      !password?.trim()
    ) {
      return NextResponse.json(
        {
          success: false,
          message: 'All fields are required',
        },
        {
          status: 400,
        }
      )
    }

    // ==========================
    // VALIDASI NAMA
    // ==========================
    if (name.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Name must be at least 3 characters',
        },
        {
          status: 400,
        }
      )
    }

    // ==========================
    // VALIDASI EMAIL
    // ==========================
    const emailRegex =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/

    if (!emailRegex.test(email)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Invalid email format',
        },
        {
          status: 400,
        }
      )
    }

    // ==========================
    // VALIDASI PASSWORD
    // ==========================
    if (password.length < 6) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Password must be at least 6 characters',
        },
        {
          status: 400,
        }
      )
    }

    // ==========================
    // VALIDASI NOMOR TELEPON
    // ==========================
    if (!/^[0-9]+$/.test(phone)) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Phone number must contain only digits',
        },
        {
          status: 400,
        }
      )
    }

    // ==========================
    // CEK EMAIL SUDAH ADA
    // ==========================
    const [existing]: any =
      await db.query(
        `
        SELECT id
        FROM users
        WHERE email = ?
      `,
        [email.trim().toLowerCase()]
      )

    if (existing.length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Email already exists',
        },
        {
          status: 400,
        }
      )
    }

    // ==========================
    // HASH PASSWORD
    // ==========================
    const hashedPassword =
      await bcrypt.hash(password, 10)

    // ==========================
    // INSERT USER CUSTOMER
    // ==========================
    const [result]: any =
      await db.query(
        `
        INSERT INTO users
        (
          name,
          email,
          phone,
          password,
          role
        )
        VALUES
        (?, ?, ?, ?, 'customer')
      `,
        [
          name.trim(),
          email.trim().toLowerCase(),
          phone.trim(),
          hashedPassword,
        ]
      )

    return NextResponse.json(
      {
        success: true,
        message:
          'Registration successful',
        userId: result.insertId,
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error(
      'REGISTER ERROR:',
      error
    )

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