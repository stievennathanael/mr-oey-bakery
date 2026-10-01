'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  AlertCircle,
  FolderTree,
  Loader2,
  Package,
  ReceiptText,
  ShoppingCart,
  Wallet,
} from 'lucide-react'
import { formatStatusLabel } from '@/lib/status-label'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

type Product = {
  id: number
}

type Category = {
  id: number
}

type OrderItem = {
  id: number
  quantity: number
  product_name: string
  subtotal: number
}

type Order = {
  id: number
  invoice_number: string
  total_price: number
  payment_method: string
  payment_status: string
  order_status: string
  created_at: string
  customer_name: string
  customer_email: string
  location_name: string | null
  items: OrderItem[]
}

function getAdminToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return (
    localStorage.getItem('admin_token') ||
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

function formatDate(value: string) {
  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getStatusClass(status: string) {
  if (
    status === 'paid' ||
    status === 'processing' ||
    status === 'ready' ||
    status === 'completed'
  ) {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (
    status === 'failed' ||
    status === 'expired' ||
    status === 'cancelled'
  ) {
    return 'border-red-200 bg-red-50 text-red-700'
  }

  return 'border-amber-200 bg-amber-50 text-amber-700'
}

async function readJson<T>(
  response: Response,
  fallback: string
) {
  const data = await response.json()

  if (!response.ok) {
    const message =
      data &&
      typeof data === 'object' &&
      'message' in data &&
      typeof data.message === 'string'
        ? data.message
        : fallback

    throw new Error(message)
  }

  return data as T
}

export default function DashboardPage() {
  const [products, setProducts] =
    useState<Product[]>([])
  const [categories, setCategories] =
    useState<Category[]>([])
  const [orders, setOrders] =
    useState<Order[]>([])
  const [loading, setLoading] =
    useState(true)
  const [error, setError] = useState('')

  async function fetchDashboard(
    showLoading = true
  ) {
    const token = getAdminToken()

    try {
      if (showLoading) {
        setLoading(true)
      }
      setError('')

      const [
        productRes,
        categoryRes,
        orderRes,
      ] = await Promise.all([
        fetch('/api/products', {
          cache: 'no-store',
        }),
        fetch('/api/categories', {
          cache: 'no-store',
        }),
        fetch('/api/orders', {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }),
      ])

      const [
        productData,
        categoryData,
        orderData,
      ] = await Promise.all([
        readJson<Product[]>(
          productRes,
          'Gagal memuat products'
        ),
        readJson<Category[]>(
          categoryRes,
          'Gagal memuat categories'
        ),
        readJson<Order[]>(
          orderRes,
          'Gagal memuat orders'
        ),
      ])

      setProducts(
        Array.isArray(productData)
          ? productData
          : []
      )
      setCategories(
        Array.isArray(categoryData)
          ? categoryData
          : []
      )
      setOrders(
        Array.isArray(orderData)
          ? orderData
          : []
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat dashboard'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchDashboard()
  }, [])

  useAutoRefresh(() =>
    fetchDashboard(false)
  )

  const revenue = useMemo(
    () =>
      orders
        .filter(
          (order) =>
            order.payment_status === 'paid'
        )
        .reduce(
          (sum, order) =>
            sum + Number(order.total_price || 0),
          0
        ),
    [orders]
  )

  const recentOrders = useMemo(
    () => orders.slice(0, 5),
    [orders]
  )

  const cards = [
    {
      title: 'Total Produk',
      value: products.length.toLocaleString(
        'id-ID'
      ),
      helper: 'Produk tersedia',
      icon: Package,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      title: 'Kategori',
      value: categories.length.toLocaleString(
        'id-ID'
      ),
      helper: 'Kategori produk',
      icon: FolderTree,
      color: 'bg-sky-50 text-sky-600',
    },
    {
      title: 'Pesanan',
      value: orders.length.toLocaleString(
        'id-ID'
      ),
      helper: 'Total pesanan',
      icon: ShoppingCart,
      color: 'bg-violet-50 text-violet-600',
    },
    {
      title: 'Pendapatan',
      value: formatCurrency(revenue),
      helper: 'Total pendapatan pesanan',
      icon: Wallet,
      color: 'bg-emerald-50 text-emerald-600',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase text-orange-600">
            Dashboard
          </p>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Ringkasan Admin
          </h1>
        </div>

        {error && (
          <div className="mb-6 flex items-center gap-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            <AlertCircle className="h-5 w-5" />
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg bg-white shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          </div>
        ) : (
          <>
            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
              {cards.map((card) => {
                const Icon = card.icon

                return (
                  <div
                    key={card.title}
                    className="rounded-lg bg-white p-6 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div>
                        <p className="text-sm font-semibold uppercase text-slate-900 sm:text-lg">
                          {card.title}
                        </p>
                        <h2 className="mt-3 break-words text-xl font-bold text-slate-950 sm:text-2xl">
                          {card.value}
                        </h2>
                        <p className="mt-2 text-slate-900">
                          {card.helper}
                        </p>
                      </div>

                      <div
                        className={`flex h-12 w-12 items-center justify-center rounded-lg ${card.color}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 rounded-lg bg-white p-6 shadow-sm">
              <div className="mb-5 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-sm font-semibold uppercase text-orange-600">
                    Recent Orders
                  </p>
                  <h2 className="text-xl font-bold text-gray-900">
                    Pesanan Terbaru
                  </h2>
                </div>

                <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
                  {recentOrders.length} Terbaru
                </div>
              </div>

              {recentOrders.length === 0 ? (
                <div className="rounded-lg border border-slate-200 p-10 text-center">
                  <ReceiptText className="mx-auto h-12 w-12 text-orange-500" />
                  <h3 className="mt-4 text-xl font-bold">
                    Belum ada pesanan
                  </h3>
                  <p className="mt-2 text-slate-500">
                    Pesanan dari pelanggan akan tampil di sini.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-slate-950 text-white">
                      <tr>
                        <th className="px-4 py-3">
                          Faktur
                        </th>
                        <th className="px-4 py-3">
                          Pelanggan
                        </th>
                        <th className="px-4 py-3">
                          Produk
                        </th>
                        <th className="px-4 py-3">
                          Total
                        </th>
                        <th className="px-4 py-3">
                          Pembayaran
                        </th>
                        <th className="px-4 py-3">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      {recentOrders.map((order) => (
                        <tr
                          key={order.id}
                          className="border-t border-slate-200 hover:bg-slate-50 text-center align-middle"
                        >
                          <td className="px-4 py-4">
                            <p className="font-bold text-slate-950">
                              {
                                order.invoice_number
                              }
                            </p>
                            <p className="mt-1 text-sm text-slate-900">
                              {formatDate(
                                order.created_at
                              )}
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <p className="font-semibold">
                              {
                                order.customer_name
                              }
                            </p>
                            <p className="text-sm text-slate-900">
                              {
                                order.customer_email
                              }
                            </p>
                          </td>
                          <td className="px-4 py-4">
                            <div className="max-w-xs space-y-1">
                              {order.items
                                .slice(0, 2)
                                .map((item) => (
                                  <p
                                    key={item.id}
                                    className="text-slate-900"
                                  >
                                    {item.quantity}x{' '}
                                    {
                                      item.product_name
                                    }
                                  </p>
                                ))}
                              {order.items.length >
                                2 && (
                                <p className="text-xs font-semibold text-slate-500">
                                  +
                                  {order.items
                                    .length - 2}{' '}
                                  item lain
                                </p>
                              )}
                            </div>
                          </td>
                          <td className="px-4 py-4 font-bold">
                            {formatCurrency(
                              order.total_price
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(
                                order.payment_status
                              )}`}
                            >
                              {formatStatusLabel(
                                order.payment_status
                              )}
                            </span>
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(
                                order.order_status
                              )}`}
                            >
                              {formatStatusLabel(
                                order.order_status
                              )}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
