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
    const { data, error } = await db
      .from('products')
      .select(
        `
          id,
          category_id,
          product_name,
          product_description,
          product_price,
          image_url,
          created_at,
          updated_at,
          categories (name)
        `
      )
      .order('created_at', { ascending: false })

    if (error) throw error

    const rows = (data || []).map(
      ({ categories, ...product }) => {
        const category = Array.isArray(categories)
          ? categories[0]
          : categories

        return {
          ...product,
          category_name: category?.name || null,
        }
      }
    )

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
    const categoryId = Number(
      formData.get('category_id') || 0
    )
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
      categoryId,
      image,
    })
    
    const { error } = await db
      .from('products')
      .insert({
        category_id: categoryId || null,
        product_name: productName,
        product_description: productDescription || null,
        product_price: Number(productPrice),
        image_url: imagePath,
      })

    if (error) throw error

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
