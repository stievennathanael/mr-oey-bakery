'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  CreditCard,
  Filter,
  Loader2,
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

type AdminPayment = {
  id: number
  order_id: number
  payment_provider: string
  payment_type: string | null
  transaction_id: string | null
  amount: number
  status: string
  transaction_status: string
  settlement_time: string | null
  paid_at: string | null
  created_at: string
  expires_at: string | null
  invoice_number: string
  customer_name: string
  customer_email: string
}

const paymentsPerPage = 10

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

type PaymentStatusFilter =
  (typeof paymentStatusOptions)[number]['value']

function matchesPaymentStatus(
  status: string,
  filter: PaymentStatusFilter
) {
  if (filter === 'all') {
    return true
  }

  return status === filter
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

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function getStatusClass(status: string) {
  if (status === 'paid') {
    return 'border-emerald-200 bg-emerald-50 text-emerald-700'
  }

  if (
    status === 'failed' ||
    status === 'expired'
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

export default function AdminPaymentsPage() {
  const [payments, setPayments] =
    useState<AdminPayment[]>([])
  const [loading, setLoading] =
    useState(true)
  const [error, setError] = useState('')
  const [busyPaymentId, setBusyPaymentId] =
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
  const [currentPage, setCurrentPage] =
    useState(1)

  const filteredPayments = useMemo(
    () =>
      payments.filter(
        (payment) =>
          isDateInRange(
            payment.created_at,
            dateRangeFilter
          ) &&
          matchesPaymentStatus(
            payment.status,
            paymentStatusFilter
          )
      ),
    [
      payments,
      dateRangeFilter,
      paymentStatusFilter,
    ]
  )

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredPayments.length / paymentsPerPage
    )
  )

  const currentPayments = useMemo(() => {
    const indexOfLastPayment =
      currentPage * paymentsPerPage
    const indexOfFirstPayment =
      indexOfLastPayment - paymentsPerPage

    return filteredPayments.slice(
      indexOfFirstPayment,
      indexOfLastPayment
    )
  }, [currentPage, filteredPayments])

  const activeFilterCount = [
    hasDateRange(dateRangeFilter),
    paymentStatusFilter !== 'all',
  ].filter(Boolean).length

  async function fetchPayments() {
    const token = getAdminToken()

    try {
      const response = await fetch('/api/payments', {
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
            'Gagal memuat payments'
          )
        )
      }

      setPayments(data)
      setError('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat payments'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchPayments()
  }, [])

  useAutoRefresh(fetchPayments, {
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

  async function updatePaymentStatus(
    paymentId: number,
    status: string
  ) {
    const token = getAdminToken()

    if (!token) return

    try {
      setBusyPaymentId(paymentId)

      const response = await fetch(
        `/api/payments/${paymentId}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            status,
          }),
        }
      )

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Gagal mengubah status payment'
          )
        )
      }

      await fetchPayments()
      setError('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal mengubah status payment'
      )
    } finally {
      setBusyPaymentId(null)
    }
  }

  function applyFilters() {
    setDateRangeFilter(
      draftDateRangeFilter
    )
    setPaymentStatusFilter(
      draftPaymentStatusFilter
    )
    setCurrentPage(1)
  }

  function resetFilters() {
    setDraftDateRangeFilter(
      createEmptyDateRangeValue()
    )
    setDraftPaymentStatusFilter('all')
    setDateRangeFilter(
      createEmptyDateRangeValue()
    )
    setPaymentStatusFilter('all')
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
              Manajemen Pembayaran
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
            <div className="grid gap-4 md:grid-cols-2">
              <div className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  Periode Pembayaran
                </span>
                <DateRangePicker
                  value={draftDateRangeFilter}
                  onChange={
                    setDraftDateRangeFilter
                  }
                  ariaLabel="Pilih periode pembayaran"
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

            {!loading && payments.length > 0 && (
              <p className="mt-4 text-sm font-medium text-slate-900">
                Menampilkan{' '}
                {filteredPayments.length.toLocaleString(
                  'id-ID'
                )}{' '}
                dari{' '}
                {payments.length.toLocaleString('id-ID')}{' '}
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
        ) : filteredPayments.length === 0 ? (
          <div className="rounded-lg bg-white p-10 text-center shadow-sm">
            <CreditCard className="mx-auto h-12 w-12 text-orange-500" />
            <h2 className="mt-4 text-2xl font-bold">
              Tidak ditemukan pembayaran
            </h2>
          </div>
        ) : (
          <div className="rounded-lg bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-orange-600">
                  Daftar Pembayaran
                </h2>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
                {filteredPayments.length.toLocaleString(
                  'id-ID'
                )}{' '}
                Pembayaran
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
              <table className="w-full min-w-[1050px]">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="px-4 py-3">
                      Faktur
                    </th>
                    <th className="px-4 py-3">
                      Pelanggan
                    </th>
                    <th className="px-4 py-3">
                      Penyedia
                    </th>
                    <th className="px-4 py-3">
                      Total
                    </th>
                    <th className="px-4 py-3">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentPayments.map(
                    (payment) => (
                      <tr
                        key={payment.id}
                        className="border-b border-slate-200 align-middle text-center hover:bg-slate-50"
                      >
                        <td className="px-4 py-4">
                          <p className="font-bold text-slate-950">
                            {payment.invoice_number}
                          </p>
                          <p className="mt-1 break-all text-sm text-slate-900">
                            {payment.transaction_id ||
                              '-'}
                          </p>
                          <p className="mt-1 text-sm text-slate-900">
                            {formatDate(
                              payment.created_at
                            )}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="font-semibold">
                            {payment.customer_name}
                          </p>
                          <p className="mt-1 text-sm text-slate-900">
                            {
                              payment.customer_email
                            }
                          </p>
                        </td>
                        <td className="px-4 py-4 font-semibold uppercase">
                          {
                            payment.payment_provider
                          }
                          {payment.payment_type && (
                            <p className="mt-1 text-sm font-medium text-slate-900">
                              {formatStatusLabel(
                                payment.payment_type
                              )}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-4 font-bold">
                          {formatCurrency(
                            payment.amount
                          )}
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(
                              payment.status
                            )}`}
                          >
                            {formatStatusLabel(
                              payment.status
                            )}
                          </span>
                          <p className="mt-2 text-sm text-slate-900">
                            Midtrans:{' '}
                            {
                              payment.transaction_status
                            }
                          </p>
                          <p className="mt-2 text-sm text-slate-900">
                            Paid at:{' '}
                            {formatDate(
                              payment.paid_at
                            )}
                          </p>
                          {payment.settlement_time && (
                            <p className="mt-1 text-sm text-slate-900">
                              Settlement:{' '}
                              {formatDate(
                                payment.settlement_time
                              )}
                            </p>
                          )}
                          {payment.status ===
                            'pending' &&
                            payment.expires_at && (
                              <p className="mt-1 text-sm text-slate-900">
                                Expired:{' '}
                                {formatDate(
                                  payment.expires_at
                                )}
                              </p>
                            )}
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>

            {filteredPayments.length >
              paymentsPerPage && (
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
