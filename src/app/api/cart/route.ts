import { NextResponse } from 'next/server'
import type { ResultSetHeader } from 'mysql2'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

type CartRow = {
  id: number
  user_id: number
  product_id: number
  quantity: number
  product_name: string
  product_description: string | null
  product_price: string | number
  image_url: string | null
  category_name: string | null
  subtotal: string | number
}

const cartQuery = `
  SELECT
    carts.id,
    carts.user_id,
    carts.product_id,
    carts.quantity,
    products.product_name,
    products.product_description,
    products.product_price,
    products.image_url,
    categories.name as category_name,
    carts.quantity * products.product_price as subtotal
  FROM carts
  INNER JOIN products
    ON carts.product_id = products.id
  LEFT JOIN categories
    ON products.category_id = categories.id
  WHERE carts.user_id = ?
  ORDER BY carts.updated_at DESC
`

async function getCart(userId: number) {
  const [rows] = await db.query(
    cartQuery,
    [userId]
  )

  const items = (rows as CartRow[]).map(
    (item) => ({
      ...item,
      product_price: Number(
        item.product_price
      ),
      subtotal: Number(item.subtotal),
    })
  )

  const totalItems = items.reduce(
    (sum, item) => sum + item.quantity,
    0
  )

  const totalPrice = items.reduce(
    (sum, item) => sum + item.subtotal,
    0
  )

  return {
    items,
    summary: {
      total_items: totalItems,
      total_price: totalPrice,
    },
  }
}

export async function GET(req: Request) {
  const user = getAuthUser(req)

  if (!user) {
    return NextResponse.json(
      {
        message: 'Unauthorized',
      },
      {
        status: 401,
      }
    )
  }

  if (user.role !== 'customer') {
    return NextResponse.json(
      {
        message: 'Forbidden',
      },
      {
        status: 403,
      }
    )
  }

  try {
    const cart = await getCart(user.id)

    return NextResponse.json(cart)
  } catch (error) {
    console.error('GET CART ERROR:', error)

    return NextResponse.json(
      {
        message: 'Failed to fetch cart',
      },
      {
        status: 500,
      }
    )
  }
}

export async function POST(req: Request) {
  const user = getAuthUser(req)

  if (!user) {
    return NextResponse.json(
      {
        message: 'Unauthorized',
      },
      {
        status: 401,
      }
    )
  }

  if (user.role !== 'customer') {
    return NextResponse.json(
      {
        message: 'Forbidden',
      },
      {
        status: 403,
      }
    )
  }

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
        {
          message: 'Invalid product or quantity',
        },
        {
          status: 400,
        }
      )
    }

    const [productRows] = await db.query(
      'SELECT id FROM products WHERE id = ? LIMIT 1',
      [productId]
    )

    if ((productRows as { id: number }[]).length === 0) {
      return NextResponse.json(
        {
          message: 'Product not found',
        },
        {
          status: 404,
        }
      )
    }

    await db.query<ResultSetHeader>(
      `
      INSERT INTO carts
      (
        user_id,
        product_id,
        quantity
      )
      VALUES (?, ?, ?)
      ON DUPLICATE KEY UPDATE
        quantity = quantity + ?,
        updated_at = CURRENT_TIMESTAMP
      `,
      [
        user.id,
        productId,
        quantity,
        quantity,
      ]
    )

    const cart = await getCart(user.id)

    return NextResponse.json(
      {
        message: 'Product added to cart',
        ...cart,
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    console.error('ADD CART ERROR:', error)

    return NextResponse.json(
      {
        message: 'Failed to add product to cart',
      },
      {
        status: 500,
      }
    )
  }
}
