import { NextResponse } from 'next/server'
import type { ResultSetHeader } from 'mysql2'
import { db } from '@/lib/db'
import { getAuthUser } from '@/lib/auth'
import {
  createPaymentExpiryDate,
  getPaymentExpiresAt,
} from '@/lib/payment-status'
import {
  createMidtransSnapTransaction,
  getMidtransClientKey,
  getMidtransSnapJsUrl,
  isMidtransConfigured,
  MidtransApiError,
  MidtransConfigurationError,
} from '@/lib/midtrans'

type CartCheckoutRow = {
  product_id: number
  quantity: number
  product_name: string
  product_price: string | number
  subtotal: string | number
}

type UserCheckoutRow = {
  name: string
  email: string
  phone: string | null
}

const paymentMethods = ['midtrans'] as const

type PaymentMethod =
  (typeof paymentMethods)[number]

function isPaymentMethod(
  method: string
): method is PaymentMethod {
  return paymentMethods.includes(
    method as PaymentMethod
  )
}

function createInvoiceNumber(userId: number) {
  const now = new Date()
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
    String(now.getMilliseconds()).padStart(3, '0'),
  ].join('')

  return `INV-${stamp}-${userId}`
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
        message: 'Only customers can checkout',
      },
      {
        status: 403,
      }
    )
  }

  if (!isMidtransConfigured()) {
    return NextResponse.json(
      {
        message:
          'Midtrans belum dikonfigurasi lengkap. Isi MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY terlebih dahulu.',
      },
      {
        status: 503,
      }
    )
  }

  const connection =
    await db.getConnection()

  try {
    const body = await req.json()
    const rawLocationId = body.location_id
    let locationId = Number(rawLocationId)
    const paymentMethod = String(
      body.payment_method || 'midtrans'
    )
      .trim()
      .toLowerCase()

    const locationIsEmpty =
      rawLocationId === undefined ||
      rawLocationId === null ||
      String(rawLocationId).trim() === ''

    if (locationIsEmpty) {
      const [pickupLocationRows] =
        await connection.query(
          `
          SELECT id
          FROM locations
          ORDER BY id ASC
          LIMIT 2
          `
        )

      const pickupLocations =
        pickupLocationRows as Array<{
          id: number
        }>

      if (pickupLocations.length === 1) {
        locationId = pickupLocations[0].id
      } else {
        return NextResponse.json(
          {
            message:
              pickupLocations.length === 0
                ? 'Lokasi pickup belum tersedia.'
                : 'Silakan pilih lokasi pickup terlebih dahulu.',
          },
          {
            status: 400,
          }
        )
      }
    } else if (
      !Number.isInteger(locationId) ||
      locationId <= 0
    ) {
      return NextResponse.json(
        {
          message: 'Invalid location',
        },
        {
          status: 400,
        }
      )
    }

    if (!isPaymentMethod(paymentMethod)) {
      return NextResponse.json(
        {
          message:
            'Metode pembayaran hanya tersedia melalui Midtrans.',
        },
        {
          status: 400,
        }
      )
    }

    const [locationRows] =
      await connection.query(
        `
        SELECT id
        FROM locations
        WHERE id = ?
        LIMIT 1
        `,
        [locationId]
      )

    if (
      (
        locationRows as Array<{
          id: number
        }>
      ).length === 0
    ) {
      return NextResponse.json(
        {
          message: 'Lokasi pickup tidak ditemukan.',
        },
        {
          status: 400,
        }
      )
    }

    const [userRows] =
      await connection.query(
        `
        SELECT name, email, phone
        FROM users
        WHERE id = ?
        LIMIT 1
        `,
        [user.id]
      )

    const customer =
      (userRows as UserCheckoutRow[])[0]

    if (!customer) {
      return NextResponse.json(
        {
          message: 'Customer tidak ditemukan.',
        },
        {
          status: 404,
        }
      )
    }

    await connection.beginTransaction()

    const [cartRows] =
      await connection.query(
        `
        SELECT
          carts.product_id,
          carts.quantity,
          products.product_name,
          products.product_price,
          carts.quantity * products.product_price as subtotal
        FROM carts
        INNER JOIN products
          ON carts.product_id = products.id
        WHERE carts.user_id = ?
        ORDER BY carts.created_at ASC
        FOR UPDATE
        `,
        [user.id]
      )

    const items =
      cartRows as CartCheckoutRow[]

    if (items.length === 0) {
      await connection.rollback()

      return NextResponse.json(
        {
          message: 'Cart is empty',
        },
        {
          status: 400,
        }
      )
    }

    const totalPrice = items.reduce(
      (sum, item) =>
        sum + Number(item.subtotal),
      0
    )

    const invoiceNumber =
      createInvoiceNumber(user.id)

    const [orderResult] =
      await connection.query<ResultSetHeader>(
        `
        INSERT INTO orders
        (
          user_id,
          customer_name,
          customer_email,
          customer_phone,
          location_id,
          invoice_number,
          total_price,
          payment_method,
          payment_status,
          order_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'unpaid', 'waiting_payment')
        `,
        [
          user.id,
          customer.name,
          customer.email,
          customer.phone,
          locationId,
          invoiceNumber,
          totalPrice,
          paymentMethod,
        ]
      )

    const orderId = orderResult.insertId

    for (const item of items) {
      await connection.query(
        `
        INSERT INTO order_items
        (
          order_id,
          product_id,
          quantity,
          product_name,
          product_price,
          subtotal
        )
        VALUES (?, ?, ?, ?, ?, ?)
        `,
        [
          orderId,
          item.product_id,
          item.quantity,
          item.product_name,
          item.product_price,
          item.subtotal,
        ]
      )
    }

    const paymentExpiryDate =
      createPaymentExpiryDate()
    const snapPayment =
      await createMidtransSnapTransaction({
        invoiceNumber,
        amount: totalPrice,
        customer,
        items: items.map((item) => ({
          id: item.product_id,
          name: item.product_name,
          price: Number(item.product_price),
          quantity: Number(item.quantity),
        })),
      })

    const [paymentResult] =
      await connection.query<ResultSetHeader>(
        `
        INSERT INTO payments
        (
          order_id,
          payment_provider,
          snap_token,
          payment_url,
          amount,
          expiry_time,
          raw_response,
          transaction_status
        )
        VALUES (?, 'Midtrans', ?, ?, ?, ?, ?, 'pending')
        `,
        [
          orderId,
          snapPayment.token,
          snapPayment.redirectUrl,
          totalPrice,
          paymentExpiryDate,
          JSON.stringify(
            snapPayment.rawResponse
          ),
        ]
      )

    await connection.query(
      'DELETE FROM carts WHERE user_id = ?',
      [user.id]
    )

    await connection.commit()

    const paymentId =
      paymentResult.insertId

    return NextResponse.json(
      {
        message: 'Checkout created',
        order: {
          id: orderId,
          invoice_number: invoiceNumber,
          total_price: totalPrice,
          payment_method: paymentMethod,
          payment_status: 'unpaid',
          order_status: 'waiting_payment',
        },
        items,
        payment: {
          id: paymentId,
          payment_provider: 'Midtrans',
          snap_token: snapPayment.token,
          payment_url: snapPayment.redirectUrl,
          amount: totalPrice,
          status: 'pending',
          transaction_status: 'pending',
          expires_at: getPaymentExpiresAt(
            paymentExpiryDate
          ),
          client_key: getMidtransClientKey(),
          snap_js_url: getMidtransSnapJsUrl(),
        },
      },
      {
        status: 201,
      }
    )
  } catch (error) {
    await connection.rollback()

    console.error('CHECKOUT ERROR:', error)

    return NextResponse.json(
      {
        message:
          error instanceof
            MidtransConfigurationError ||
          error instanceof MidtransApiError
            ? error.message
            : 'Failed to checkout',
      },
      {
        status:
          error instanceof MidtransApiError
            ? error.statusCode
            : error instanceof
              MidtransConfigurationError
            ? 503
            : 500,
      }
    )
  } finally {
    connection.release()
  }
}
