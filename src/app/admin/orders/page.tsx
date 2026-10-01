'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Filter,
  Loader2,
  PackageCheck,
  RotateCcw,
} from 'lucide-react'
import DateRangePicker, {
  createEmptyDateRangeValue,
  hasDateRange,
  isDateInRange,
  type DateRangeValue,
} from '@/components/admin/date-range-picker'
import { formatStatusLabel } from '@/lib/status-label'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

type OrderItem = {
  id: number
  quantity: number
  product_name: string
  subtotal: number
}

type AdminOrder = {
  id: number
  invoice_number: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  location_name: string | null
  total_price: number
  payment_method: string
  payment_status: string
  order_status: string
  created_at: string
  payment_expires_at: string | null
  items: OrderItem[]
}

const orderStatuses = [
  'ready',
  'completed',
] as const

type OrderStatusAction =
  (typeof orderStatuses)[number]

const ordersPerPage = 10

const paymentStatusOptions = [
  {
    value: 'all',
    label: 'Semua Status Pembayaran',
  },
  {
    value: 'pending',
    label: 'Pending',
  },
  {
    value: 'paid',
    label: 'Paid',
  },
  {
    value: 'failed',
    label: 'Failed',
  },
  {
    value: 'expired',
    label: 'Expired',
  },
] as const

const orderStatusOptions = [
  {
    value: 'all',
    label: 'Semua Status Pesanan',
  },
  {
    value: 'waiting_payment',
    label: 'Waiting Payment',
  },
  {
    value: 'processing',
    label: 'Processing',
  },
  {
    value: 'ready',
    label: 'Ready',
  },
  {
    value: 'completed',
    label: 'Completed',
  },
  {
    value: 'cancelled',
    label: 'Cancelled',
  },
] as const

type PaymentStatusFilter =
  (typeof paymentStatusOptions)[number]['value']

type OrderStatusFilter =
  (typeof orderStatusOptions)[number]['value']

function matchesPaymentStatus(
  status: string,
  filter: PaymentStatusFilter
) {
  if (filter === 'all') {
    return true
  }

  if (filter === 'pending') {
    return (
      status === 'pending' ||
      status === 'unpaid'
    )
  }

  return status === filter
}

function isOrderStatusAction(
  status: string
): status is OrderStatusAction {
  return orderStatuses.includes(
    status as OrderStatusAction
  )
}

function canUpdateOrderStatus(
  order: AdminOrder
) {
  const paymentStatus =
    order.payment_status.toLowerCase()
  const orderStatus =
    order.order_status.toLowerCase()

  return (
    paymentStatus === 'paid' &&
    (orderStatus === 'processing' ||
      orderStatus === 'ready')
  )
}

function shouldShowOrderStatusSelect(
  order: AdminOrder
) {
  const paymentStatus =
    order.payment_status.toLowerCase()
  const orderStatus =
    order.order_status.toLowerCase()

  return (
    paymentStatus !== 'failed' &&
    paymentStatus !== 'expired' &&
    orderStatus !== 'cancelled'
  )
}

function getOrderStatusSelectValue(
  order: AdminOrder
) {
  const orderStatus =
    order.order_status.toLowerCase()

  return isOrderStatusAction(orderStatus)
    ? orderStatus
    : ''
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

export default function AdminOrdersPage() {
  const [orders, setOrders] =
    useState<AdminOrder[]>([])
  const [loading, setLoading] =
    useState(true)
  const [error, setError] = useState('')
  const [busyOrderId, setBusyOrderId] =
    useState<number | null>(null)
  const [showFilters, setShowFilters] =
    useState(false)
  const [
    dateRangeFilter,
    setDateRangeFilter,
  ] = useState<DateRangeValue>(() =>
    createEmptyDateRangeValue()
  )
  const [
    draftDateRangeFilter,
    setDraftDateRangeFilter,
  ] = useState<DateRangeValue>(() =>
    createEmptyDateRangeValue()
  )
  const [
    paymentStatusFilter,
    setPaymentStatusFilter,
  ] = useState<PaymentStatusFilter>('all')
  const [
    draftPaymentStatusFilter,
    setDraftPaymentStatusFilter,
  ] = useState<PaymentStatusFilter>('all')
  const [
    orderStatusFilter,
    setOrderStatusFilter,
  ] = useState<OrderStatusFilter>('all')
  const [
    draftOrderStatusFilter,
    setDraftOrderStatusFilter,
  ] = useState<OrderStatusFilter>('all')
  const [currentPage, setCurrentPage] =
    useState(1)

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          isDateInRange(
            order.created_at,
            dateRangeFilter
          ) &&
          matchesPaymentStatus(
            order.payment_status,
            paymentStatusFilter
          ) &&
          (orderStatusFilter === 'all' ||
            order.order_status ===
              orderStatusFilter)
      ),
    [
      orders,
      dateRangeFilter,
      paymentStatusFilter,
      orderStatusFilter,
    ]
  )

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredOrders.length / ordersPerPage
    )
  )

  const currentOrders = useMemo(() => {
    const indexOfLastOrder =
      currentPage * ordersPerPage
    const indexOfFirstOrder =
      indexOfLastOrder - ordersPerPage

    return filteredOrders.slice(
      indexOfFirstOrder,
      indexOfLastOrder
    )
  }, [currentPage, filteredOrders])

  const activeFilterCount = [
    hasDateRange(dateRangeFilter),
    paymentStatusFilter !== 'all',
    orderStatusFilter !== 'all',
  ].filter(Boolean).length

  async function fetchOrders() {
    const token = getAdminToken()

    try {
      const response = await fetch('/api/orders', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Gagal memuat orders'
          )
        )
      }

      setOrders(data)
      window.dispatchEvent(
        new Event('admin-orders-changed')
      )
      setError('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat orders'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchOrders()
  }, [])

  useAutoRefresh(fetchOrders, {
    intervalMs: 15000,
  })

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    const mainContent =
      document.getElementById(
        'admin-main-content'
      )

    if (mainContent) {
      mainContent.scrollTo({
        top: 0,
        behavior: 'smooth',
      })
    }
  }, [currentPage])

  async function updateOrderStatus(
    targetOrder: AdminOrder,
    status: string
  ) {
    const token = getAdminToken()

    if (
      !token ||
      !canUpdateOrderStatus(targetOrder) ||
      !isOrderStatusAction(status)
    ) {
      return
    }

    try {
      setBusyOrderId(targetOrder.id)

      const response = await fetch(
        `/api/orders/${targetOrder.id}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            order_status: status,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Gagal mengubah status order'
          )
        )
      }

      setOrders((current) =>
        current.map((order) =>
          order.id === targetOrder.id
            ? {
                ...order,
                order_status: status,
              }
            : order
        )
      )
      window.dispatchEvent(
        new Event('admin-orders-changed')
      )
      setError('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengubah status order'
      )
    } finally {
      setBusyOrderId(null)
    }
  }

  function applyFilters() {
    setDateRangeFilter(
      draftDateRangeFilter
    )
    setPaymentStatusFilter(
      draftPaymentStatusFilter
    )
    setOrderStatusFilter(
      draftOrderStatusFilter
    )
    setCurrentPage(1)
  }

  function resetFilters() {
    setDraftDateRangeFilter(
      createEmptyDateRangeValue()
    )
    setDraftPaymentStatusFilter('all')
    setDraftOrderStatusFilter('all')
    setDateRangeFilter(
      createEmptyDateRangeValue()
    )
    setPaymentStatusFilter('all')
    setOrderStatusFilter('all')
    setCurrentPage(1)
  }

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-orange-600">
              Admin
            </p>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Manajemen Pesanan
            </h1>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowFilters((open) => !open)
            }
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 sm:w-auto"
          >
            <Filter className="h-5 w-5" />
            Filter
            {activeFilterCount > 0 && (
              <span className="rounded-full bg-white px-2 py-0.5 text-xs font-bold text-orange-600">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {showFilters && (
          <div className="mb-6 rounded-lg bg-white p-5 shadow-sm">
            <div className="grid gap-4 lg:grid-cols-3">
              <div className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  Periode Pesanan
                </span>
                <DateRangePicker
                  value={draftDateRangeFilter}
                  onChange={
                    setDraftDateRangeFilter
                  }
                  ariaLabel="Pilih periode pesanan"
                />
              </div>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  Status Pembayaran
                </span>
                <select
                  value={draftPaymentStatusFilter}
                  onChange={(event) =>
                    setDraftPaymentStatusFilter(
                      event.target
                        .value as PaymentStatusFilter
                    )
                  }
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                >
                  {paymentStatusOptions.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  Status Pesanan
                </span>
                <select
                  value={draftOrderStatusFilter}
                  onChange={(event) =>
                    setDraftOrderStatusFilter(
                      event.target
                        .value as OrderStatusFilter
                    )
                  }
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                >
                  {orderStatusOptions.map(
                    (option) => (
                      <option
                        key={option.value}
                        value={option.value}
                      >
                        {option.label}
                      </option>
                    )
                  )}
                </select>
              </label>
            </div>

            <div className="mt-5 flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={applyFilters}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
              >
                <Filter className="h-5 w-5" />
                Terapkan Filter
              </button>

              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-50"
              >
                <RotateCcw className="h-5 w-5" />
                Reset
              </button>
            </div>

            {!loading && orders.length > 0 && (
              <p className="mt-4 text-sm font-medium text-slate-900">
                Menampilkan{' '}
                {filteredOrders.length.toLocaleString(
                  'id-ID'
                )}{' '}
                dari{' '}
                {orders.length.toLocaleString('id-ID')}{' '}
                pesanan
              </p>
            )}
          </div>
        )}

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg bg-white shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="rounded-lg bg-white p-10 text-center shadow-sm">
            <PackageCheck className="mx-auto h-12 w-12 text-orange-500" />
            <h2 className="mt-4 text-2xl font-bold">
              Tidak ditemukan pesanan
            </h2>
          </div>
        ) : (
          <div className="rounded-lg bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-orange-600">
                  Daftar Pesanan
                </h2>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
                {filteredOrders.length.toLocaleString(
                  'id-ID'
                )}{' '}
                Pesanan
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
              <table className="w-full min-w-[1100px]">
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
                    <th className="px-4 py-3">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentOrders.map((order) => {
                    const showOrderStatusSelect =
                      shouldShowOrderStatusSelect(order)
                    const canChangeOrderStatus =
                      canUpdateOrderStatus(order)

                    return (
                      <tr
                        key={order.id}
                        className="border-b border-slate-200 align-middle text-center hover:bg-slate-50"
                      >
                      <td className="px-4 py-4">
                        <p className="font-bold text-slate-950">
                          {order.invoice_number}
                        </p>
                        <p className="mt-1 text-sm text-slate-900">
                          {formatDate(
                            order.created_at
                          )}
                        </p>
                        <p className="mt-1 text-sm text-slate-900">
                          {order.location_name || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold">
                          {order.customer_name}
                        </p>
                        <p className="mt-1 text-sm text-slate-900">
                          {order.customer_email}
                        </p>
                        <p className="mt-1 text-sm text-slate-900">
                          {order.customer_phone || '-'}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="max-w-xs space-y-1">
                          {order.items.map(
                            (item) => (
                              <p
                                key={item.id}
                                className="text-slate-900"
                              >
                                {item.quantity}x{' '}
                                {item.product_name}
                              </p>
                            )
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
                      <td className="px-4 py-4">
                        {showOrderStatusSelect ? (
                          <select
                            aria-label={`Status ${order.invoice_number}`}
                            value={getOrderStatusSelectValue(
                              order
                            )}
                            onChange={(event) =>
                              updateOrderStatus(
                                order,
                                event.target.value
                              )
                            }
                            disabled={
                              !canChangeOrderStatus ||
                              busyOrderId ===
                                order.id
                            }
                            className="rounded-lg border border-slate-300 bg-white px-2 py-2 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200 disabled:opacity-60"
                          >
                            <option
                              value=""
                              disabled
                              hidden
                            >
                              {canChangeOrderStatus
                                ? 'Ubah status pesanan'
                                : 'Belum dapat diubah'}
                            </option>
                            {orderStatuses.map(
                              (status) => (
                                <option
                                  key={status}
                                  value={status}
                                >
                                  {formatStatusLabel(
                                    status
                                  )}
                                </option>
                              )
                            )}
                          </select>
                        ) : (
                          <span className="text-sm text-slate-500 rounded-lg border border-slate-300 bg-white px-11 py-2.5">
                            Tidak Tersedia
                          </span>
                        )}
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>

            {filteredOrders.length >
              ordersPerPage && (
              <div className="flex flex-wrap justify-center gap-2 border-t border-slate-200 px-6 py-5">
                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.max(1, page - 1)
                    )
                  }
                  disabled={currentPage === 1}
                  className="
                    rounded-xl
                    border
                    border-orange-200
                    bg-white
                    px-5
                    py-3
                    font-semibold
                    text-orange-500
                    transition
                    hover:bg-orange-50
                    disabled:opacity-40"
                >
                  &larr;
                </button>

                {Array.from({
                  length: totalPages,
                }).map((_, index) => {
                  const page = index + 1

                  return (
                    <button
                      key={page}
                      type="button"
                      onClick={() =>
                        setCurrentPage(page)
                      }
                      className={`h-12
                        w-12
                        rounded-xl
                        font-bold
                        transition ${
                        page === currentPage
                          ? 'bg-orange-500 text-white shadow-lg'
                          : 'bg-white text-orange-500 hover:bg-orange-50'
                      }`}
                    >
                      {page}
                    </button>
                  )
                })}

                <button
                  type="button"
                  onClick={() =>
                    setCurrentPage((page) =>
                      Math.min(
                        totalPages,
                        page + 1
                      )
                    )
                  }
                  disabled={
                    currentPage === totalPages
                  }
                  className="
                    rounded-xl
                    border
                    border-orange-200
                    bg-white
                    px-5
                    py-3
                    font-semibold
                    text-orange-500
                    transition
                    hover:bg-orange-50
                    disabled:opacity-40"
                >
                  &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
