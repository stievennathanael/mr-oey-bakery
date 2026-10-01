import { NextResponse } from 'next/server'
import type { ResultSetHeader } from 'mysql2'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'

type Params = {
  params: Promise<{
    id: string
  }>
}

async function getCartItem(
  cartId: number,
  userId: number
) {
  const [rows] = await db.query(
    `
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
    WHERE carts.id = ?
      AND carts.user_id = ?
    LIMIT 1
    `,
    [
      cartId,
      userId,
    ]
  )

  const item = (
    rows as Array<{
      product_price: string | number
      subtotal: string | number
      [key: string]: unknown
    }>
  )[0]

  if (!item) return null

  return {
    ...item,
    product_price: Number(
      item.product_price
    ),
    subtotal: Number(item.subtotal),
  }
}

async function updateQuantity(
  req: Request,
  { params }: Params
) {
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
        {
          message: 'Invalid cart item or quantity',
        },
        {
          status: 400,
        }
      )
    }

    if (quantity <= 0) {
      const [deleteResult] =
        await db.query<ResultSetHeader>(
          `
          DELETE FROM carts
          WHERE id = ?
            AND user_id = ?
          `,
          [
            cartId,
            user.id,
          ]
        )

      if (deleteResult.affectedRows === 0) {
        return NextResponse.json(
          {
            message: 'Cart item not found',
          },
          {
            status: 404,
          }
        )
      }

      return NextResponse.json({
        message: 'Cart item deleted',
      })
    }

    const [result] =
      await db.query<ResultSetHeader>(
        `
        UPDATE carts
        SET quantity = ?
        WHERE id = ?
          AND user_id = ?
        `,
        [
          quantity,
          cartId,
          user.id,
        ]
      )

    if (result.affectedRows === 0) {
      return NextResponse.json(
        {
          message: 'Cart item not found',
        },
        {
          status: 404,
        }
      )
    }

    const item = await getCartItem(
      cartId,
      user.id
    )

    return NextResponse.json({
      message: 'Cart quantity updated',
      item,
    })
  } catch (error) {
    console.error('UPDATE CART ERROR:', error)

    return NextResponse.json(
      {
        message: 'Failed to update cart quantity',
      },
      {
        status: 500,
      }
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
    const { id } = await params
    const cartId = Number(id)

    if (
      !Number.isInteger(cartId) ||
      cartId <= 0
    ) {
      return NextResponse.json(
        {
          message: 'Invalid cart item',
        },
        {
          status: 400,
        }
      )
    }

    const [result] =
      await db.query<ResultSetHeader>(
        `
        DELETE FROM carts
        WHERE id = ?
          AND user_id = ?
        `,
        [
          cartId,
          user.id,
        ]
      )

    if (result.affectedRows === 0) {
      return NextResponse.json(
        {
          message: 'Cart item not found',
        },
        {
          status: 404,
        }
      )
    }

    return NextResponse.json({
      message: 'Cart item deleted',
    })
  } catch (error) {
    console.error('DELETE CART ERROR:', error)

    return NextResponse.json(
      {
        message: 'Failed to delete cart item',
      },
      {
        status: 500,
      }
    )
  }
}
