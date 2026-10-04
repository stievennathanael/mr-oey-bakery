'use client'

import Link from 'next/link'
import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import {
  LogIn,
  ArrowRight,
  CheckCircle2,
  Clock3,
  CreditCard,
  Loader2,
  MapPin,
  Minus,
  Plus,
  ReceiptText,
  ShoppingBag,
  Trash2,
} from 'lucide-react'
import { formatStatusLabel } from '@/lib/status-label'
import { notifyCartUpdated } from '@/lib/cart-events'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

type CartItem = {
  id: number
  product_id: number
  quantity: number
  product_name: string
  product_description: string | null
  product_price: number
  image_url: string | null
  category_name: string | null
  subtotal: number
}

type CartSummary = {
  total_items: number
  total_price: number
}

type CartResponse = {
  items: CartItem[]
  summary: CartSummary
}

type Location = {
  id: number
  name: string
  address?: string
}

type CheckoutResult = {
  order: {
    id: number
    invoice_number: string
    total_price: number
    payment_method: string
    payment_status: string
    order_status: string
  }
  items: Array<{
    product_id: number
    quantity: number
    product_name: string
    product_price: number
    subtotal: number
  }>
  payment: {
    id: number
    payment_provider: string
    transaction_id?: string | null
    snap_token: string
    payment_url: string
    amount: number
    status: string
    transaction_status: string
    expires_at?: string | null
    client_key: string
    snap_js_url: string
  }
}

type MidtransCallbackResult =
  Record<string, unknown>

type MidtransSnapOptions = {
  embedId: string
  onSuccess?: (
    result: MidtransCallbackResult
  ) => void
  onPending?: (
    result: MidtransCallbackResult
  ) => void
  onError?: (
    result: MidtransCallbackResult
  ) => void
  onClose?: () => void
}

declare global {
  interface Window {
    snap?: {
      embed: (
        token: string,
        options: MidtransSnapOptions
      ) => void
      hide?: () => void
    }
  }
}

const MIDTRANS_CONTAINER_ID =
  'midtrans-snap-container'

let midtransSnapScriptPromise:
  | Promise<void>
  | null = null

function loadMidtransSnapScript(
  src: string,
  clientKey: string
) {
  if (typeof window === 'undefined') {
    return Promise.reject(
      new Error('Browser belum siap.')
    )
  }

  if (window.snap) {
    return Promise.resolve()
  }

  if (midtransSnapScriptPromise) {
    return midtransSnapScriptPromise
  }

  midtransSnapScriptPromise =
    new Promise<void>((resolve, reject) => {
      const existing =
        document.querySelector<HTMLScriptElement>(
          'script[data-midtrans-snap="true"]'
        )

      if (existing) {
        existing.addEventListener('load', () =>
          resolve()
        )
        existing.addEventListener('error', () =>
          reject(
            new Error(
              'Gagal memuat Midtrans Snap.'
            )
          )
        )
        return
      }

      const script =
        document.createElement('script')
      script.src = src
      script.async = true
      script.dataset.midtransSnap = 'true'
      script.setAttribute(
        'data-client-key',
        clientKey
      )
      script.onload = () => resolve()
      script.onerror = () =>
        reject(
          new Error(
            'Gagal memuat Midtrans Snap.'
          )
        )

      document.body.appendChild(script)
    })

  return midtransSnapScriptPromise
}

function resetMidtransSnapEmbed() {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.snap?.hide?.()
  } catch (error) {
    console.error(error)
  }

  document
    .getElementById(MIDTRANS_CONTAINER_ID)
    ?.replaceChildren()
}

const emptyCart: CartResponse = {
  items: [],
  summary: {
    total_items: 0,
    total_price: 0,
  },
}

function getCustomerToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return (
    localStorage.getItem('customer_token') ||
    localStorage.getItem('token')
  )
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(Number(value || 0))
}

function formatDate(value: string | null | undefined) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getErrorMessage(
  data: unknown,
  fallback: string
) {
  if (
    data &&
    typeof data === 'object' &&
    'message' in data &&
    typeof data.message === 'string'
  ) {
    return data.message
  }

  return fallback
}

export default function CartPage() {
  const [cart, setCart] =
    useState<CartResponse>(emptyCart)
  const [locations, setLocations] =
    useState<Location[]>([])
  const [locationId, setLocationId] =
    useState('')
  const [checkout, setCheckout] =
    useState<CheckoutResult | null>(null)
  const [loading, setLoading] =
    useState(true)
  const [checkoutLoading, setCheckoutLoading] =
    useState(false)
  const [snapLoading, setSnapLoading] =
    useState(false)
  const [snapError, setSnapError] =
    useState('')
  const [busyItemId, setBusyItemId] =
    useState<number | null>(null)
  const [pageError, setPageError] =
    useState('')
  const [actionMessage, setActionMessage] =
    useState('')
  const [actionError, setActionError] =
    useState('')
  const snapEmbedKeyRef =
    useRef<string | null>(null)

  const hasMultipleLocations =
    locations.length > 1
  const hasPickupLocations =
    locations.length > 0
  const selectedLocation = useMemo(
    () => {
      if (locations.length === 1) {
        return locations[0]
      }

      return locations.find(
        (location) =>
          String(location.id) === locationId
      )
    },
    [
      locations,
      locationId,
    ]
  )

  const hasItems = cart.items.length > 0
  const paymentStatus =
    checkout?.payment.status ||
    checkout?.order.payment_status ||
    ''
  const paymentIsPaid =
    paymentStatus === 'paid' ||
    checkout?.order.payment_status === 'paid'
  const paymentIsExpired =
    paymentStatus === 'expired' ||
    checkout?.order.payment_status === 'expired'
  const paymentIsFailed =
    paymentStatus === 'failed' ||
    checkout?.order.payment_status === 'failed'
  const paymentIsFinal =
    paymentIsPaid ||
    paymentIsExpired ||
    paymentIsFailed
  const paymentIsPending =
    Boolean(checkout) && !paymentIsFinal

  async function fetchCart() {
    const token = getCustomerToken()

    if (!token) {
      setPageError(
        'Silakan masuk terlebih dahulu untuk dapat melihat keranjang'
      )
      setCart(emptyCart)
      notifyCartUpdated(0)
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/cart', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data =
        (await response.json()) as CartResponse & {
          message?: string
        }

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Gagal memuat cart'
          )
        )
      }

      setCart(data)
      notifyCartUpdated(
        data.items.length
      )
      setPageError('')
    } catch (error) {
      setPageError(
        error instanceof Error
          ? error.message
          : 'Gagal memuat cart'
      )
    } finally {
      setLoading(false)
    }
  }

  async function fetchLocations() {
    try {
      const response = await fetch('/api/locations', {
        cache: 'no-store',
      })
      const data = await response.json()

      if (response.ok) {
        setLocations(data)
      }
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchCart()
    fetchLocations()
  }, [])

  useAutoRefresh(
    async () => {
      await Promise.all([
        fetchCart(),
        fetchLocations(),
      ])
    },
    {
      intervalMs: 15000,
    }
  )

  useEffect(() => {
    if (locations.length === 1) {
      const singleLocationId = String(
        locations[0].id
      )

      setLocationId((current) =>
        current === singleLocationId
          ? current
          : singleLocationId
      )
      return
    }

    if (locations.length > 1) {
      setLocationId((current) =>
        locations.some(
          (location) =>
            String(location.id) === current
        )
          ? current
          : ''
      )
      return
    }

    setLocationId('')
  }, [locations])

  useEffect(() => {
    if (!checkout || paymentIsFinal) {
      return
    }

    const token = getCustomerToken()

    if (!token) {
      return
    }

    const paymentId = checkout.payment.id
    let cancelled = false

    async function refreshPaymentStatus() {
      try {
        const response = await fetch(
          `/api/payments/${paymentId}`,
          {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }
        )

        const data = await response.json()

        if (!response.ok) {
          throw new Error(
            getErrorMessage(
              data,
              'Gagal memuat status pembayaran'
            )
          )
        }

        if (cancelled) {
          return
        }

        setCheckout((current) =>
          current &&
          current.payment.id === paymentId
            ? {
                ...current,
                payment: {
                  ...current.payment,
                  status:
                    data.payment?.status ||
                    current.payment.status,
                  transaction_status:
                    data.payment
                      ?.transaction_status ||
                    current.payment
                      .transaction_status,
                  transaction_id:
                    data.payment
                      ?.transaction_id ||
                    current.payment
                      .transaction_id,
                  expires_at:
                    data.payment?.expires_at ||
                    current.payment.expires_at,
                },
                order: {
                  ...current.order,
                  payment_status:
                    data.order?.payment_status ||
                    current.order.payment_status,
                  order_status:
                    data.order?.order_status ||
                    current.order.order_status,
                },
              }
            : current
        )

        if (
          data.payment?.status === 'paid' ||
          data.order?.payment_status === 'paid'
        ) {
          setActionError('')
          setActionMessage(
            'Pembayaran berhasil. Pesanan sudah masuk ke daftar order.'
          )
        } else if (
          data.payment?.status === 'expired' ||
          data.order?.payment_status === 'expired'
        ) {
          setActionMessage('')
          setActionError(
            'Waktu pembayaran Midtrans sudah habis. Silakan checkout ulang jika masih ingin membeli.'
          )
        } else if (
          data.payment?.status === 'failed' ||
          data.order?.payment_status === 'failed'
        ) {
          setActionMessage('')
          setActionError(
            'Pembayaran Midtrans gagal. Silakan checkout ulang atau gunakan transaksi baru.'
          )
        }
      } catch (error) {
        console.error(error)
      }
    }

    const intervalId = window.setInterval(
      refreshPaymentStatus,
      5000
    )

    void refreshPaymentStatus()

    return () => {
      cancelled = true
      window.clearInterval(intervalId)
    }
  }, [checkout?.payment.id, paymentIsFinal])

  useEffect(() => {
    if (
      !checkout ||
      paymentIsFinal ||
      !checkout.payment.snap_token
    ) {
      snapEmbedKeyRef.current = null
      resetMidtransSnapEmbed()
      return
    }

    const {
      snap_token: snapToken,
      snap_js_url: snapJsUrl,
      client_key: clientKey,
    } = checkout.payment

    let cancelled = false
    const snapEmbedKey = [
      snapToken,
      snapJsUrl,
      clientKey,
    ].join(':')

    async function embedSnap() {
      try {
        setSnapLoading(true)
        setSnapError('')

        await loadMidtransSnapScript(
          snapJsUrl,
          clientKey
        )

        if (cancelled) {
          return
        }

        const container =
          document.getElementById(
            MIDTRANS_CONTAINER_ID
          )

        if (!container || !window.snap) {
          throw new Error(
            'Midtrans Snap belum siap.'
          )
        }

        if (
          snapEmbedKeyRef.current ===
            snapEmbedKey &&
          container.childElementCount > 0
        ) {
          return
        }

        resetMidtransSnapEmbed()
        window.snap.embed(snapToken, {
          embedId: MIDTRANS_CONTAINER_ID,
          onSuccess: () => {
            setActionError('')
            setActionMessage(
              'Pembayaran berhasil. Pesanan sedang diproses.'
            )
          },
          onPending: () => {
            setActionMessage(
              'Pembayaran sedang menunggu konfirmasi Midtrans.'
            )
          },
          onError: () => {
            setActionMessage('')
            setActionError(
              'Pembayaran Midtrans gagal diproses.'
            )
          },
          onClose: () => {
            setActionMessage(
              'Jendela pembayaran ditutup. Anda masih bisa melanjutkan pembayaran selama belum expired.'
            )
          },
        })
        snapEmbedKeyRef.current = snapEmbedKey
      } catch (error) {
        if (cancelled) {
          return
        }

        setSnapError(
          error instanceof Error
            ? error.message
            : 'Gagal memuat Midtrans Snap.'
        )
      } finally {
        if (!cancelled) {
          setSnapLoading(false)
        }
      }
    }

    void embedSnap()

    return () => {
      cancelled = true
      if (
        snapEmbedKeyRef.current ===
        snapEmbedKey
      ) {
        snapEmbedKeyRef.current = null
        resetMidtransSnapEmbed()
      }
    }
  }, [
    checkout?.payment.snap_token,
    checkout?.payment.snap_js_url,
    checkout?.payment.client_key,
    paymentIsFinal,
  ])

  async function updateQuantity(
    item: CartItem,
    quantity: number
  ) {
    const token = getCustomerToken()

    if (!token) {
      setPageError(
        'Silakan masuk terlebih dahulu untuk dapat mengubah keranjang'
      )
      return
    }

    try {
      setBusyItemId(item.id)
      setActionError('')
      setActionMessage('')

      const response = await fetch(
        `/api/cart/${item.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            quantity,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Gagal mengubah jumlah produk'
          )
        )
      }

      await fetchCart()
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Gagal mengubah jumlah produk'
      )
    } finally {
      setBusyItemId(null)
    }
  }

  async function removeItem(item: CartItem) {
    const token = getCustomerToken()

    if (!token) {
      setPageError(
        'Silakan masuk terlebih dahulu untuk dapat menghapus keranjang'
      )
      return
    }

    try {
      setBusyItemId(item.id)
      setActionError('')
      setActionMessage('')

      const response = await fetch(
        `/api/cart/${item.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Gagal menghapus produk'
          )
        )
      }

      await fetchCart()
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Gagal menghapus produk'
      )
    } finally {
      setBusyItemId(null)
    }
  }

  async function handleCheckout() {
    const token = getCustomerToken()

    if (!token) {
      setPageError(
        'Silakan masuk terlebih dahulu untuk dapat melakukan checkout'
      )
      return
    }

    if (!hasItems) {
      setActionError('Keranjang masih kosong.')
      return
    }

    if (!hasPickupLocations) {
      setActionMessage('')
      setActionError(
        'Lokasi pickup belum tersedia.'
      )
      return
    }

    const checkoutLocationId =
      locationId ||
      (locations.length === 1
        ? String(locations[0].id)
        : '')

    if (
      hasMultipleLocations &&
      !checkoutLocationId
    ) {
      setActionMessage('')
      setActionError(
        'Silakan pilih lokasi pickup terlebih dahulu.'
      )
      return
    }

    if (!checkoutLocationId) {
      setActionMessage('')
      setActionError(
        'Lokasi pickup belum tersedia.'
      )
      return
    }

    try {
      setCheckoutLoading(true)
      setSnapError('')
      setActionError('')
      setActionMessage('')

      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          location_id: Number(
            checkoutLocationId
          ),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Checkout gagal'
          )
        )
      }

      setCheckout(data)
      setActionMessage(
        'Checkout berhasil dibuat. Silakan selesaikan pembayaran melalui Midtrans.'
      )
      await fetchCart()
    } catch (error) {
      setActionError(
        error instanceof Error
          ? error.message
          : 'Checkout gagal'
      )
    } finally {
      setCheckoutLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 text-slate-900 sm:pb-16 sm:pt-28">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-orange-600">
              Cart
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl md:text-3xl">
              Keranjang Saya
            </h1>
          </div>

          <div className="grid gap-2 text-sm text-slate-900 sm:grid-cols-4">
            {[
              'Cart',
              'Checkout',
              'Payment',
              'Order',
            ].map((step, index) => (
              <div
                key={step}
                className="flex items-center gap-2"
              >
                <span
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold ${
                    checkout ||
                    index === 0
                      ? 'bg-orange-500 text-white'
                      : 'bg-white text-slate-900 ring-1 ring-slate-200'
                  }`}
                >
                  {index + 1}
                </span>
                <span className="font-medium">
                  {step}
                </span>
              </div>
            ))}
          </div>
        </div>

        {pageError ? (
          <div className="mt-8 rounded-lg border border-orange-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <ShoppingBag className="mx-auto h-12 w-12 text-orange-500" />
            <h2 className="mt-4 text-2xl font-bold">
              Keranjang Belum Dapat Ditampilkan
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-900">
              {pageError}
            </p>
            <Link
              href="/auth/login"
              className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
            >
              <LogIn size={18} />
              Masuk
            </Link>
          </div>
        ) : loading ? (
          <div className="flex min-h-[360px] items-center justify-center">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          </div>
        ) : (
          <div className="mt-8 grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:gap-8">
            <div className="space-y-4">
              {actionError && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                  {actionError}
                </div>
              )}

              {actionMessage && (
                <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
                  {actionMessage}
                </div>
              )}

              {hasItems ? (
                cart.items.map((item) => (
                  <article
                    key={item.id}
                    className="grid gap-4 rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[112px_minmax(0,1fr)_auto]"
                  >
                    <img
                      src={
                        item.image_url ||
                        '/logo.png'
                      }
                      alt={item.product_name}
                      className="h-28 w-28 rounded-lg border border-slate-100 object-cover"
                    />

                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-orange-600">
                        {item.category_name ||
                          'Produk'}
                      </p>
                      <h2 className="mt-1 text-xl font-bold text-slate-950">
                        {item.product_name}
                      </h2>
                      <p className="mt-2 line-clamp-2 text-sm text-slate-900">
                        {item.product_description ||
                          'Produk Mr. Oey Bakery'}
                      </p>
                      <p className="mt-3 font-semibold text-slate-900">
                        {formatCurrency(
                          item.product_price
                        )}
                      </p>
                    </div>

                    <div className="flex flex-col items-start justify-between gap-4 sm:items-end">
                      <button
                        type="button"
                        title="Hapus produk"
                        aria-label={`Hapus ${item.product_name}`}
                        onClick={() =>
                          removeItem(item)
                        }
                        disabled={
                          busyItemId === item.id
                        }
                        className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 text-red-600 transition hover:bg-red-50 disabled:opacity-50"
                      >
                        <Trash2 className="h-5 w-5" />
                      </button>

                      <div className="flex items-center rounded-lg border border-slate-200 bg-slate-50">
                        <button
                          type="button"
                          title="Kurangi jumlah"
                          aria-label={`Kurangi ${item.product_name}`}
                          onClick={() =>
                            updateQuantity(
                              item,
                              item.quantity - 1
                            )
                          }
                          disabled={
                            busyItemId === item.id
                          }
                          className="inline-flex h-10 w-10 items-center justify-center text-slate-900 transition hover:bg-white disabled:opacity-50"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="min-w-12 text-center font-bold">
                          {busyItemId ===
                          item.id ? (
                            <Loader2 className="mx-auto h-4 w-4 animate-spin" />
                          ) : (
                            item.quantity
                          )}
                        </span>
                        <button
                          type="button"
                          title="Tambah jumlah"
                          aria-label={`Tambah ${item.product_name}`}
                          onClick={() =>
                            updateQuantity(
                              item,
                              item.quantity + 1
                            )
                          }
                          disabled={
                            busyItemId === item.id
                          }
                          className="inline-flex h-10 w-10 items-center justify-center text-slate-900 transition hover:bg-white disabled:opacity-50"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>

                      <div className="text-left sm:text-right">
                        <p className="text-xs uppercase text-slate-900">
                          Subtotal
                        </p>
                        <p className="text-lg font-bold text-slate-950">
                          {formatCurrency(
                            item.subtotal
                          )}
                        </p>
                      </div>
                    </div>
                  </article>
                ))
              ) : (
                <div className="rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
                  <ShoppingBag className="mx-auto h-12 w-12 text-orange-500" />
                  <h2 className="mt-4 text-2xl font-bold">
                    Keranjang Kosong!
                  </h2>
                  <p className="mt-2 text-slate-900">
                    Tambahkan terlebih dahulu produk pesanan Anda ke dalam keranjang
                  </p>
                  <Link
                    href="/menu"
                    className="mt-6 inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
                  >
                    Lihat Produk
                    <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              )}

              {checkout && (
                <section className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
                  <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <p className="text-sm font-semibold uppercase text-orange-600">
                        Payment
                      </p>
                      <h2 className="mt-2 text-2xl font-bold">
                        {checkout.order.invoice_number}
                      </h2>
                      <p className="mt-2 text-slate-900">
                        Total pembayaran{' '}
                        <span className="font-bold text-slate-950">
                          {formatCurrency(
                            checkout.payment.amount
                          )}
                        </span>
                      </p>

                      <div className="mt-4 grid gap-3 sm:grid-cols-2">
                        <div className="rounded-lg border border-slate-200 p-4">
                          <p className="text-xs uppercase text-slate-900">
                            Transaction ID
                          </p>
                          <p className="mt-1 break-all font-semibold">
                            {checkout.payment
                              .transaction_id ||
                              checkout.order
                                .invoice_number}
                          </p>
                        </div>
                        <div className="rounded-lg border border-slate-200 p-4">
                          <p className="text-xs uppercase text-slate-900">
                            Status
                          </p>
                          <p className="mt-1 font-semibold capitalize text-slate-950">
                            {formatStatusLabel(
                              checkout.order
                                .payment_status
                            )}{' '}
                            /{' '}
                            {formatStatusLabel(
                              checkout.order
                                .order_status
                            )}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="w-full max-w-md rounded-lg border border-slate-200 bg-slate-50 p-3 text-center sm:p-4 lg:min-w-[420px]">
                      {paymentIsPending ? (
                        <div className="rounded-lg border border-slate-200 bg-white p-2">
                          {snapLoading && (
                            <div className="flex min-h-40 items-center justify-center">
                              <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
                            </div>
                          )}

                          {snapError && (
                            <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
                              {snapError}
                              {checkout.payment
                                .payment_url && (
                                <a
                                  href={
                                    checkout.payment
                                      .payment_url
                                  }
                                  target="_blank"
                                  rel="noreferrer"
                                  className="mt-3 inline-flex w-full items-center justify-center rounded-lg bg-red-600 px-4 py-2 text-white transition hover:bg-red-700"
                                >
                                  Buka halaman Midtrans
                                </a>
                              )}
                            </div>
                          )}

                          <div
                            id={MIDTRANS_CONTAINER_ID}
                            className="min-h-[420px] w-full overflow-hidden rounded-md bg-white sm:min-h-[560px]"
                          />
                        </div>
                      ) : (
                        <div className="flex h-64 w-full flex-col items-center justify-center rounded-lg bg-white p-4">
                          {paymentIsPaid ? (
                            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                          ) : (
                            <Clock3 className="h-12 w-12 text-red-600" />
                          )}
                          <p className="mt-3 font-semibold capitalize text-slate-800">
                            {formatStatusLabel(
                              paymentStatus
                            )}
                          </p>
                        </div>
                      )}
                      {paymentIsPaid ? (
                        <div className="mt-4 rounded-lg bg-emerald-50 p-3 text-sm font-semibold text-emerald-700">
                          <CheckCircle2 className="mx-auto mb-2 h-5 w-5" />
                          Pembayaran berhasil
                        </div>
                      ) : paymentIsExpired ? (
                        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
                          <Clock3 className="mx-auto mb-2 h-5 w-5" />
                          Pembayaran kadaluwarsa
                        </div>
                      ) : paymentIsFailed ? (
                        <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm font-semibold text-red-700">
                          <Clock3 className="mx-auto mb-2 h-5 w-5" />
                          Pembayaran gagal
                        </div>
                      ) : (
                        <div className="mt-4 rounded-lg bg-amber-50 p-3 text-sm font-semibold text-amber-700">
                          <Clock3 className="mx-auto mb-2 h-5 w-5" />
                          Menunggu pembayaran Midtrans
                        </div>
                      )}

                      {checkout.payment.expires_at &&
                        paymentIsPending && (
                          <p className="mt-3 text-xs font-medium text-slate-900">
                            Batas bayar:{' '}
                            {formatDate(
                              checkout.payment
                                .expires_at
                            )}
                          </p>
                        )}

                      <Link
                        href="/order"
                        className="mt-3 inline-flex w-full items-center justify-center rounded-lg border border-slate-300 px-4 py-3 font-semibold text-slate-900 transition hover:bg-white"
                      >
                        Lihat Pesanan
                      </Link>
                    </div>
                  </div>
                </section>
              )}
            </div>

            <aside className="h-fit rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-6">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-slate-100">
                  <ReceiptText className="h-5 w-5 text-slate-900" />
                </div>
                <div>
                  <p className="text-sm text-slate-900">
                    Ringkasan
                  </p>
                  <h2 className="text-xl font-bold">
                    Checkout
                  </h2>
                </div>
              </div>

              <div className="mt-6 space-y-3 border-y border-slate-200 py-5">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-900">
                    Total produk
                  </span>
                  <span className="font-semibold">
                    {cart.summary.total_items}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-900">
                    Total harga
                  </span>
                  <span className="font-bold text-slate-950">
                    {formatCurrency(
                      cart.summary.total_price
                    )}
                  </span>
                </div>
              </div>

              <div className="mt-5 space-y-4">
                <div>
                  <span className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <MapPin className="h-4 w-4" />
                    Lokasi Pengambilan
                  </span>

                  {locations.length === 1 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                      <p className="font-semibold text-slate-900">
                        {locations[0].name}
                      </p>
                      <p className="mt-1 text-sm text-slate-900">
                        {locations[0].address ||
                          'Alamat belum tersedia.'}
                      </p>
                    </div>
                  ) : (
                    <select
                      value={locationId}
                      onChange={(event) =>
                        setLocationId(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    >
                      <option value="">
                        Pilih lokasi pengambilan
                      </option>
                      {locations.map(
                        (location) => (
                          <option
                            key={location.id}
                            value={location.id}
                          >
                            {location.name}
                          </option>
                        )
                      )}
                    </select>
                  )}
                </div>

                {hasMultipleLocations &&
                  selectedLocation?.address && (
                    <p className="rounded-lg bg-slate-50 p-3 text-sm text-slate-900">
                      {selectedLocation.address}
                    </p>
                  )}

                {hasMultipleLocations &&
                  !locationId && (
                    <p className="text-sm font-medium text-amber-700">
                      Lokasi pengambilan wajib dipilih sebelum checkout.
                    </p>
                  )}

                {!hasPickupLocations && (
                  <p className="text-sm font-medium text-amber-700">
                    Lokasi pickup belum tersedia.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={handleCheckout}
                disabled={
                  !hasItems ||
                  !hasPickupLocations ||
                  (hasMultipleLocations &&
                    !locationId) ||
                  checkoutLoading
                }
                className="mt-6 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {checkoutLoading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <CreditCard className="h-5 w-5" />
                )}
                Checkout
              </button>
            </aside>
          </div>
        )}
      </section>
    </main>
  )
}
