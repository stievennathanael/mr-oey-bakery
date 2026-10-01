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

type Params = {
  params: Promise<{
    id: string
  }>
}

export async function PUT(
  req: Request,
  { params }: Params
) {
  const authError = requireAdmin(req)

  if (authError) return authError

  try {
    const { id } = await params

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

    if (image && image.size > 0) {
      const bytes = await image.arrayBuffer()
      const buffer = Buffer.from(bytes)

      const filename =
        uuidv4() + path.extname(image.name)

      const uploadDir = path.join(
        process.cwd(),
        'public/uploads'
      )

      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true })
      }

      const filePath = path.join(uploadDir, filename)

      fs.writeFileSync(filePath, buffer)

      imagePath = `/uploads/${filename}`

      await db.query(
        `
        UPDATE products
        SET
          category_id = ?,
          product_name = ?,
          product_description = ?,
          product_price = ?,
          image_url = ?
        WHERE id = ?
        `,
        [
          category_id || null,
          productName,
          productDescription,
          productPrice,
          imagePath,
          id,
        ]
      )
    } else {
      await db.query(
        `
        UPDATE products
        SET
          category_id = ?,
          product_name = ?,
          product_description = ?,
          product_price = ?
        WHERE id = ?
        `,
        [
          category_id || null,
          productName,
          productDescription,
          productPrice,
          id,
        ]
      )
    }

    return NextResponse.json({
      message: 'Product updated successfully',
    })
  } catch (error) {
    console.error(
      'UPDATE PRODUCT ERROR:',
      error
    )

    return NextResponse.json(
      {
        message:
          'Failed to update product',
      },
      {
        status: 500,
      }
    )
  }
}

export async function DELETE(
  req: Request,
  { params }: Params
) {
  const authError = requireAdmin(req)

  if (authError) return authError

  try {
    const { id } = await params

    await db.query(
      'DELETE FROM products WHERE id = ?',
      [id]
    )

    return NextResponse.json({
      message: 'Product deleted successfully',
    })
  } catch (error) {
    return NextResponse.json(
      { message: 'Failed to delete product' },
      { status: 500 }
    )
  }
}
