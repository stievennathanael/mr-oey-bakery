import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import {
  getAuthUser,
  isAdmin,
} from '@/lib/auth'
import {
  ProductImageValidationError,
  removeProductImage,
  uploadProductImage,
} from '@/lib/product-images'

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
    const categoryId = Number(
      formData.get('category_id') || 0
    )
    const image = formData.get('image') as File

    const productId = Number(id)

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { message: 'Invalid product id' },
        { status: 400 }
      )
    }

    const { data: existingProduct, error: existingProductError } = await db
      .from('products')
      .select('image_url')
      .eq('id', productId)
      .maybeSingle()

    if (existingProductError) throw existingProductError

    if (!existingProduct) {
      return NextResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      )
    }

    if (image && image.size > 0) {
      const imagePath = await uploadProductImage(image)

      const { error } = await db
        .from('products')
        .update({
          category_id: categoryId || null,
          product_name: productName,
          product_description: productDescription || null,
          product_price: Number(productPrice),
          image_url: imagePath,
        })
        .eq('id', productId)

      if (error) throw error

      await removeProductImage(existingProduct.image_url)
    } else {
      const { error } = await db
        .from('products')
        .update({
          category_id: categoryId || null,
          product_name: productName,
          product_description: productDescription || null,
          product_price: Number(productPrice),
        })
        .eq('id', productId)

      if (error) throw error
    }

    return NextResponse.json({
      message: 'Product updated successfully',
    })
  } catch (error) {
    if (
      error instanceof TypeError &&
      error.message === 'Failed to parse body as FormData.'
    ) {
      return NextResponse.json(
        { message: 'Invalid multipart form data.' },
        { status: 400 }
      )
    }

    if (error instanceof ProductImageValidationError) {
      return NextResponse.json(
        { message: error.message },
        { status: 400 }
      )
    }

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
    const productId = Number(id)

    if (!Number.isInteger(productId) || productId <= 0) {
      return NextResponse.json(
        { message: 'Invalid product id' },
        { status: 400 }
      )
    }

    const { data: existingProduct, error: existingProductError } = await db
      .from('products')
      .select('image_url')
      .eq('id', productId)
      .maybeSingle()

    if (existingProductError) throw existingProductError

    if (!existingProduct) {
      return NextResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      )
    }

    const { error } = await db
      .from('products')
      .delete()
      .eq('id', productId)

    if (error) throw error

    await removeProductImage(existingProduct.image_url)

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
