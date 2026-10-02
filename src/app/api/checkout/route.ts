import { NextResponse } from 'next/server'
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
  id: number
  product_id: number
  quantity: number
  products:
    | {
        product_name: string
        product_price: string | number
      }
    | Array<{
        product_name: string
        product_price: string | number
      }>
    | null
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
      { message: 'Unauthorized' },
      { status: 401 }
    )
  }

  if (user.role !== 'customer') {
    return NextResponse.json(
      { message: 'Only customers can checkout' },
      { status: 403 }
    )
  }

  if (!isMidtransConfigured()) {
    return NextResponse.json(
      {
        message:
          'Midtrans belum dikonfigurasi lengkap. Isi MIDTRANS_SERVER_KEY dan MIDTRANS_CLIENT_KEY terlebih dahulu.',
      },
      { status: 503 }
    )
  }

  let createdOrderId: number | null = null

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
      const { data, error } = await db
        .from('locations')
        .select('id')
        .order('id', { ascending: true })
        .limit(2)

      if (error) throw error

      if (data.length === 1) {
        locationId = data[0].id
      } else {
        return NextResponse.json(
          {
            message:
              data.length === 0
                ? 'Lokasi pickup belum tersedia.'
                : 'Silakan pilih lokasi pickup terlebih dahulu.',
          },
          { status: 400 }
        )
      }
    } else if (
      !Number.isInteger(locationId) ||
      locationId <= 0
    ) {
      return NextResponse.json(
        { message: 'Invalid location' },
        { status: 400 }
      )
    }

    if (!isPaymentMethod(paymentMethod)) {
      return NextResponse.json(
        {
          message:
            'Metode pembayaran hanya tersedia melalui Midtrans.',
        },
        { status: 400 }
      )
    }

    const { data: location, error: locationError } =
      await db
        .from('locations')
        .select('id')
        .eq('id', locationId)
        .maybeSingle()

    if (locationError) throw locationError

    if (!location) {
      return NextResponse.json(
        { message: 'Lokasi pickup tidak ditemukan.' },
        { status: 400 }
      )
    }

    const { data: customer, error: customerError } =
      await db
        .from('users')
        .select('name, email, phone')
        .eq('id', user.id)
        .maybeSingle()

    if (customerError) throw customerError

    if (!customer) {
      return NextResponse.json(
        { message: 'Customer tidak ditemukan.' },
        { status: 404 }
      )
    }

    const { data: cartRows, error: cartError } = await db
      .from('carts')
      .select(
        `
          id,
          product_id,
          quantity,
          products!inner (product_name, product_price)
        `
      )
      .eq('user_id', user.id)
      .order('created_at', { ascending: true })

    if (cartError) throw cartError

    const cartItems = (cartRows || []) as CartCheckoutRow[]
    const items = cartItems.map((item) => {
      const product = Array.isArray(item.products)
        ? item.products[0]
        : item.products

      if (!product) {
        throw new Error('Cart product is missing')
      }

      const productPrice = Number(product.product_price)

      return {
        id: item.id,
        product_id: item.product_id,
        quantity: Number(item.quantity),
        product_name: product.product_name,
        product_price: productPrice,
        subtotal: Number(item.quantity) * productPrice,
      }
    })

    if (items.length === 0) {
      return NextResponse.json(
        { message: 'Cart is empty' },
        { status: 400 }
      )
    }

    const totalPrice = items.reduce(
      (sum, item) => sum + item.subtotal,
      0
    )
    const invoiceNumber = createInvoiceNumber(user.id)
    const paymentExpiryDate = createPaymentExpiryDate()
    const snapPayment = await createMidtransSnapTransaction({
      invoiceNumber,
      amount: totalPrice,
      customer: customer as UserCheckoutRow,
      items: items.map((item) => ({
        id: item.product_id,
        name: item.product_name,
        price: item.product_price,
        quantity: item.quantity,
      })),
    })

    const { data: order, error: orderError } = await db
      .from('orders')
      .insert({
        user_id: user.id,
        customer_name: customer.name,
        customer_email: customer.email,
        customer_phone: customer.phone,
        location_id: locationId,
        invoice_number: invoiceNumber,
        total_price: totalPrice,
        payment_method: paymentMethod,
        payment_status: 'unpaid',
        order_status: 'waiting_payment',
      })
      .select('id')
      .single()

    if (orderError) throw orderError

    createdOrderId = order.id

    const { error: itemsError } = await db
      .from('order_items')
      .insert(
        items.map((item) => ({
          order_id: order.id,
          product_id: item.product_id,
          quantity: item.quantity,
          product_name: item.product_name,
          product_price: item.product_price,
          subtotal: item.subtotal,
        }))
      )

    if (itemsError) throw itemsError

    const { data: payment, error: paymentError } = await db
      .from('payments')
      .insert({
        order_id: order.id,
        payment_provider: 'Midtrans',
        snap_token: snapPayment.token,
        payment_url: snapPayment.redirectUrl,
        amount: totalPrice,
        expiry_time: paymentExpiryDate.toISOString(),
        raw_response: snapPayment.rawResponse,
        transaction_status: 'pending',
      })
      .select('id')
      .single()

    if (paymentError) throw paymentError

    const { error: clearCartError } = await db
      .from('carts')
      .delete()
      .in(
        'id',
        items.map((item) => item.id)
      )
      .eq('user_id', user.id)

    if (clearCartError) throw clearCartError

    return NextResponse.json(
      {
        message: 'Checkout created',
        order: {
          id: order.id,
          invoice_number: invoiceNumber,
          total_price: totalPrice,
          payment_method: paymentMethod,
          payment_status: 'unpaid',
          order_status: 'waiting_payment',
        },
        items,
        payment: {
          id: payment.id,
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
      { status: 201 }
    )
  } catch (error) {
    if (createdOrderId) {
      const { error: cleanupError } = await db
        .from('orders')
        .delete()
        .eq('id', createdOrderId)

      if (cleanupError) {
        console.error(
          'CHECKOUT CLEANUP ERROR:',
          cleanupError
        )
      }
    }

    console.error('CHECKOUT ERROR:', error)

    return NextResponse.json(
      {
        message:
          error instanceof MidtransConfigurationError ||
          error instanceof MidtransApiError
            ? error.message
            : 'Failed to checkout',
      },
      {
        status:
          error instanceof MidtransApiError
            ? error.statusCode
            : error instanceof MidtransConfigurationError
              ? 503
              : 500,
      }
    )
  }
}
