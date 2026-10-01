import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getAuthUser,
  isAdmin,
} from '@/lib/auth'
import path from 'path'
import fs from 'fs'
import { v4 as uuidv4 } from 'uuid'

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
      SELECT
        products.id,
        products.category_id,
        products.product_name,
        products.product_description,
        products.product_price,
        products.image_url,
        products.created_at,
        products.updated_at,
        categories.name as category_name
      FROM products
      LEFT JOIN categories
      ON products.category_id = categories.id
      ORDER BY products.created_at DESC
    `)

    return NextResponse.json(rows)
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to fetch products' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const authError = requireAdmin(req)

  if (authError) return authError

  try {
    const formData = await req.formData()

    const productName =
      (formData.get('product_name') ||
        formData.get('name')) as string
    const productDescription =
      (formData.get('product_description') ||
        formData.get('description')) as string
    const productPrice =
      (formData.get('product_price') ||
        formData.get('price')) as string
    const category_id = formData.get('category_id') as string
    const image = formData.get('image') as File

    let imagePath = null

    if (
      image &&
      image.size > 0
    ) {
      const bytes =
        await image.arrayBuffer()

      const buffer =
        Buffer.from(bytes)

      const filename =
        uuidv4() +
        path.extname(image.name)

      const uploadDir = path.join(
        process.cwd(),
        'public/uploads'
      )

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, {
          recursive: true,
        })
      }

      fs.writeFileSync(
        path.join(uploadDir, filename),
        buffer
      )

      imagePath =
        `/uploads/${filename}`
    }

    console.log({
      productName,
      productDescription,
      productPrice,
      category_id,
      image,
    })
    
    await db.query(
      `
      INSERT INTO products
      (
        category_id,
        product_name,
        product_description,
        product_price,
        image_url
      )
      VALUES (?, ?, ?, ?, ?)
      `,
      [
        category_id || null,
        productName,
        productDescription,
        productPrice,
        imagePath,
      ]
    )

    return NextResponse.json({
      message: 'Product created successfully',
    })
  } catch (error) {
    console.error(
      'CREATE PRODUCT ERROR:', 
      error
    )

    return NextResponse.json(
      {
        message: 'Failed to create product',
        error: String(error),
      },
      { status: 500 }
    )
  }
}
