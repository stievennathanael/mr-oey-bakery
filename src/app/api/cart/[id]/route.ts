import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

type Params = {
  params: Promise<{ id: string }>
}

type ProductRelation = {
  product_name: string
  product_description: string | null
  product_price: string | number
  image_url: string | null
  categories: { name: string } | Array<{ name: string }> | null
}

type CartRelationRow = {
  id: number
  user_id: number
  product_id: number
  quantity: number
  products: ProductRelation | ProductRelation[] | null
}

function requireCustomer(req: Request) {
  const user = getAuthUser(req)

  if (!user) {
    return {
      user: null,
      response: NextResponse.json(
        { message: 'Unauthorized' },
        { status: 401 }
      ),
    }
  }

  if (user.role !== 'customer') {
    return {
      user: null,
      response: NextResponse.json(
        { message: 'Forbidden' },
        { status: 403 }
      ),
    }
  }

  return { user, response: null }
}

async function getCartItem(
  cartId: number,
  userId: number
) {
  const { data, error } = await db
    .from('carts')
    .select(
      `
        id,
        user_id,
        product_id,
        quantity,
        products!inner (
          product_name,
          product_description,
          product_price,
          image_url,
          categories (name)
        )
      `
    )
    .eq('id', cartId)
    .eq('user_id', userId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null

  const item = data as CartRelationRow

  const product = Array.isArray(item.products)
    ? item.products[0]
    : item.products

  if (!product) return null

  const productPrice = Number(product.product_price)
  const category = Array.isArray(product.categories)
    ? product.categories[0]
    : product.categories

  return {
    id: item.id,
    user_id: item.user_id,
    product_id: item.product_id,
    quantity: item.quantity,
    product_name: product.product_name,
    product_description:
      product.product_description,
    product_price: productPrice,
    image_url: product.image_url,
    category_name:
      category?.name || null,
    subtotal: item.quantity * productPrice,
  }
}

async function updateQuantity(
  req: Request,
  { params }: Params
) {
  const { user, response } = requireCustomer(req)

  if (response || !user) return response

  try {
    const { id } = await params
    const cartId = Number(id)
    const body = await req.json()
    const quantity = Number(body.quantity)

    if (
      !Number.isInteger(cartId) ||
      cartId <= 0 ||
      !Number.isInteger(quantity)
    ) {
      return NextResponse.json(
        { message: 'Invalid cart item or quantity' },
        { status: 400 }
      )
    }

    if (quantity <= 0) {
      const { data, error } = await db
        .from('carts')
        .delete()
        .eq('id', cartId)
        .eq('user_id', user.id)
        .select('id')

      if (error) throw error

      if (!data?.length) {
        return NextResponse.json(
          { message: 'Cart item not found' },
          { status: 404 }
        )
      }

      return NextResponse.json({ message: 'Cart item deleted' })
    }

    const { data, error } = await db
      .from('carts')
      .update({ quantity })
      .eq('id', cartId)
      .eq('user_id', user.id)
      .select('id')

    if (error) throw error

    if (!data?.length) {
      return NextResponse.json(
        { message: 'Cart item not found' },
        { status: 404 }
      )
    }

    const item = await getCartItem(cartId, user.id)

    return NextResponse.json({
      message: 'Cart quantity updated',
      item,
    })
  } catch (error) {
    console.error('UPDATE CART ERROR:', error)

    return NextResponse.json(
      { message: 'Failed to update cart quantity' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  req: Request,
  context: Params
) {
  return updateQuantity(req, context)
}

export async function PUT(
  req: Request,
  context: Params
) {
  return updateQuantity(req, context)
}

export async function DELETE(
  req: Request,
  { params }: Params
) {
  const { user, response } = requireCustomer(req)

  if (response || !user) return response

  try {
    const { id } = await params
    const cartId = Number(id)

    if (!Number.isInteger(cartId) || cartId <= 0) {
      return NextResponse.json(
        { message: 'Invalid cart item' },
        { status: 400 }
      )
    }

    const { data, error } = await db
      .from('carts')
      .delete()
      .eq('id', cartId)
      .eq('user_id', user.id)
      .select('id')

    if (error) throw error

    if (!data?.length) {
      return NextResponse.json(
        { message: 'Cart item not found' },
        { status: 404 }
      )
    }

    return NextResponse.json({ message: 'Cart item deleted' })
  } catch (error) {
    console.error('DELETE CART ERROR:', error)

    return NextResponse.json(
      { message: 'Failed to delete cart item' },
      { status: 500 }
    )
  }
}
