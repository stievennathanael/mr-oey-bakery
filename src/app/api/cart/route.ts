import { NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

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

async function getCart(userId: number) {
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
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) throw error

  const items = ((data || []) as CartRelationRow[]).map(
    ({ products, ...cart }) => {
      const product = Array.isArray(products)
        ? products[0]
        : products

      if (!product) {
        throw new Error('Cart product is missing')
      }

      const productPrice = Number(product.product_price)
      const category = Array.isArray(product.categories)
        ? product.categories[0]
        : product.categories

      return {
        ...cart,
        product_name: product.product_name,
        product_description:
          product.product_description,
        product_price: productPrice,
        image_url: product.image_url,
        category_name:
          category?.name || null,
        subtotal: cart.quantity * productPrice,
      }
    }
  )

  return {
    items,
    summary: {
      total_items: items.reduce(
        (sum, item) => sum + item.quantity,
        0
      ),
      total_price: items.reduce(
        (sum, item) => sum + item.subtotal,
        0
      ),
    },
  }
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

export async function GET(req: Request) {
  const { user, response } = requireCustomer(req)

  if (response || !user) return response

  try {
    return NextResponse.json(await getCart(user.id))
  } catch (error) {
    console.error('GET CART ERROR:', error)

    return NextResponse.json(
      { message: 'Failed to fetch cart' },
      { status: 500 }
    )
  }
}

export async function POST(req: Request) {
  const { user, response } = requireCustomer(req)

  if (response || !user) return response

  try {
    const body = await req.json()
    const productId = Number(body.product_id)
    const quantity = Math.max(
      1,
      Number(body.quantity || 1)
    )

    if (
      !Number.isInteger(productId) ||
      productId <= 0 ||
      !Number.isInteger(quantity)
    ) {
      return NextResponse.json(
        { message: 'Invalid product or quantity' },
        { status: 400 }
      )
    }

    const { data: product, error: productError } =
      await db
        .from('products')
        .select('id')
        .eq('id', productId)
        .maybeSingle()

    if (productError) throw productError

    if (!product) {
      return NextResponse.json(
        { message: 'Product not found' },
        { status: 404 }
      )
    }

    const { data: cartItem, error: cartLookupError } =
      await db
        .from('carts')
        .select('id, quantity')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle()

    if (cartLookupError) throw cartLookupError

    const mutation = cartItem
      ? db
          .from('carts')
          .update({
            quantity: Number(cartItem.quantity) + quantity,
          })
          .eq('id', cartItem.id)
      : db.from('carts').insert({
          user_id: user.id,
          product_id: productId,
          quantity,
        })
    const { error } = await mutation

    if (error) throw error

    const cart = await getCart(user.id)

    return NextResponse.json(
      { message: 'Product added to cart', ...cart },
      { status: 201 }
    )
  } catch (error) {
    console.error('ADD CART ERROR:', error)

    return NextResponse.json(
      { message: 'Failed to add product to cart' },
      { status: 500 }
    )
  }
}
