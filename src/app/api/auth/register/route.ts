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
          message: 'Semua kolom wajib diisi',
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
            'Nama harus terdiri dari minimal 3 karakter',
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
            'Format email tidak valid',
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
            'Kata sandi harus terdiri dari minimal 6 karakter',
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
            'Nomor telepon harus hanya terdiri dari angka',
        },
        {
          status: 400,
        }
      )
    }

    // ==========================
    // CEK EMAIL SUDAH ADA
    // ==========================
    const { data: existing, error: lookupError } =
      await db
        .from('users')
        .select('id')
        .eq('email', email.trim().toLowerCase())
        .limit(1)

    if (lookupError) throw lookupError

    if ((existing || []).length > 0) {
      return NextResponse.json(
        {
          success: false,
          message:
            'Alamat email tersebut sudah ada',
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
    const { data: newUser, error: insertError } =
      await db
        .from('users')
        .insert({
          name: name.trim(),
          email: email.trim().toLowerCase(),
          phone: phone.trim(),
          password: hashedPassword,
          role: 'customer',
        })
        .select('id')
        .single()

    if (insertError) throw insertError

    return NextResponse.json(
      {
        success: true,
        message:
          'Registration successful',
        userId: newUser.id,
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
