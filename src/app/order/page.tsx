'use client'

import Link from 'next/link'
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  LogIn,
  CheckCircle2,
  Clock3,
  FileDown,
  Filter,
  Loader2,
  PackageCheck,
  ReceiptText,
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
  order_id: number
  product_id: number
  quantity: number
  product_name: string
  product_price: number
  subtotal: number
}

type Order = {
  id: number
  invoice_number: string
  total_price: number
  payment_status: string
  order_status: string
  customer_name: string
  customer_email: string
  customer_phone: string | null
  paid_at: string | null
  created_at: string
  location_name: string | null
  payment_id: number | null
  transaction_id: string | null
  payment_provider: string | null
  payment_type: string | null
  payment_transaction_status: string | null
  payment_url: string | null
  snap_token: string | null
  payment_expires_at: string | null
  items: OrderItem[]
}

type PdfImage = {
  name: string
  width: number
  height: number
  dataHex: string
}

const ordersPerPage = 5

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

function formatDate(value: string | null) {
  if (!value) return '-'

  return new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

function formatInvoiceDateTime(
  value: string | null
) {
  if (!value) return '-'

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return '-'
  }

  const day = String(date.getDate()).padStart(2, '0')
  const month = String(
    date.getMonth() + 1
  ).padStart(2, '0')
  const year = date.getFullYear()
  const hours = String(date.getHours()).padStart(2, '0')
  const minutes = String(
    date.getMinutes()
  ).padStart(2, '0')

  return `${day}-${month}-${year} ${hours}:${minutes}`
}

function sanitizeFileName(value: string) {
  return value.replace(/[\\/:*?"<>|]/g, '-')
}

function downloadBlob(
  blob: Blob,
  fileName: string
) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  link.remove()

  window.setTimeout(() => {
    URL.revokeObjectURL(url)
  }, 1000)
}

function sanitizePdfText(value: string) {
  return value
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function escapePdfText(value: string) {
  return sanitizePdfText(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
}

function truncateText(
  value: string,
  maxLength: number
) {
  const text = sanitizePdfText(value)

  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength - 3)}...`
}

function addPdfText(
  commands: string[],
  x: number,
  y: number,
  text: string,
  size = 9,
  bold = false
) {
  commands.push(
    `BT /${bold ? 'F2' : 'F1'} ${size} Tf ${x} ${y} Td (${escapePdfText(
      text
    )}) Tj ET`
  )
}

function addPdfLine(
  commands: string[],
  x1: number,
  y1: number,
  x2: number,
  y2: number
) {
  commands.push(
    `0.5 w ${x1} ${y1} m ${x2} ${y2} l S`
  )
}

function addPdfImage(
  commands: string[],
  imageName: string,
  x: number,
  y: number,
  width: number,
  height: number
) {
  commands.push(
    `q ${width} 0 0 ${height} ${x} ${y} cm /${imageName} Do Q`
  )
}

function dataUrlToHex(dataUrl: string) {
  const base64 = dataUrl.split(',')[1] || ''
  const binary = window.atob(base64)
  let hex = ''

  for (
    let index = 0;
    index < binary.length;
    index += 1
  ) {
    hex += binary
      .charCodeAt(index)
      .toString(16)
      .padStart(2, '0')
  }

  return hex
}

async function loadPdfImage(
  src: string,
  name: string,
  maxSize = 220
): Promise<PdfImage | null> {
  return new Promise((resolve) => {
    const image = new window.Image()

    image.onload = () => {
      const width = image.naturalWidth || image.width
      const height = image.naturalHeight || image.height

      if (!width || !height) {
        resolve(null)
        return
      }

      const scale = Math.min(
        maxSize / width,
        maxSize / height,
        1
      )
      const canvas = document.createElement('canvas')

      canvas.width = Math.max(
        1,
        Math.round(width * scale)
      )
      canvas.height = Math.max(
        1,
        Math.round(height * scale)
      )

      const context = canvas.getContext('2d')

      if (!context) {
        resolve(null)
        return
      }

      context.fillStyle = '#ffffff'
      context.fillRect(
        0,
        0,
        canvas.width,
        canvas.height
      )
      context.drawImage(
        image,
        0,
        0,
        canvas.width,
        canvas.height
      )

      resolve({
        name,
        width: canvas.width,
        height: canvas.height,
        dataHex: dataUrlToHex(
          canvas.toDataURL('image/jpeg', 0.9)
        ),
      })
    }

    image.onerror = () => resolve(null)
    image.src = src
  })
}

function getPdfImageHeight(
  image: PdfImage,
  width: number
) {
  return Math.round((width * image.height) / image.width)
}

function buildPdfBlob(
  pages: string[],
  images: PdfImage[] = []
) {
  const objects: string[] = []

  objects[1] =
    '<< /Type /Catalog /Pages 2 0 R >>'
  objects[3] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  objects[4] =
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>'

  const pageRefs: string[] = []
  let nextObject = 5
  const imageRefs = images.map((image) => {
    const objectId = nextObject
    const stream = `${image.dataHex}>`

    nextObject += 1
    objects[objectId] =
      `<< /Type /XObject /Subtype /Image /Width ${image.width} /Height ${image.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter [/ASCIIHexDecode /DCTDecode] /Length ${stream.length} >>\nstream\n${stream}\nendstream`

    return {
      ...image,
      objectId,
    }
  })
  const imageResources =
    imageRefs.length > 0
      ? `/XObject << ${imageRefs
          .map(
            (image) =>
              `/${image.name} ${image.objectId} 0 R`
          )
          .join(' ')} >>`
      : ''

  pages.forEach((page) => {
    const pageObject = nextObject
    const contentObject = nextObject + 1

    nextObject += 2
    pageRefs.push(`${pageObject} 0 R`)

    objects[pageObject] =
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${imageResources} >> /Contents ${contentObject} 0 R >>`
    objects[contentObject] =
      `<< /Length ${page.length} >>\nstream\n${page}\nendstream`
  })

  objects[2] =
    `<< /Type /Pages /Kids [${pageRefs.join(
      ' '
    )}] /Count ${pages.length} >>`

  let pdf = '%PDF-1.4\n'
  const offsets = ['0000000000 65535 f ']

  for (let index = 1; index < objects.length; index += 1) {
    offsets[index] = `${String(pdf.length).padStart(
      10,
      '0'
    )} 00000 n `
    pdf += `${index} 0 obj\n${objects[index]}\nendobj\n`
  }

  const xrefOffset = pdf.length

  pdf += `xref\n0 ${objects.length}\n${offsets.join(
    '\n'
  )}\n`
  pdf += `trailer\n<< /Size ${objects.length} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`

  return new Blob([pdf], {
    type: 'application/pdf',
  })
}

function addInvoiceField(
  commands: string[],
  x: number,
  y: number,
  label: string,
  value: string,
  maxLength = 34
) {
  addPdfText(commands, x, y, label, 8, true)
  addPdfText(
    commands,
    x,
    y - 13,
    truncateText(value, maxLength),
    9
  )
}

function createInvoicePdfBlob(
  order: Order,
  logoImage: PdfImage | null
) {
  const pages: string[] = []
  let commands: string[] = []
  let y = 0

  function startPage(pageNumber: number) {
    commands = []

    if (logoImage) {
      const logoWidth = 64
      const logoHeight = getPdfImageHeight(
        logoImage,
        logoWidth
      )

      addPdfImage(
        commands,
        logoImage.name,
        40,
        748,
        logoWidth,
        logoHeight
      )
    }

    addPdfText(
      commands,
      120,
      790,
      'Invoice Pesanan Mr. Oey Bakery',
      18,
      true
    )
    addPdfText(
      commands,
      120,
      770,
      pageNumber === 1
        ? order.invoice_number
        : `${order.invoice_number} - Lanjutan`,
      10
    )
    addPdfLine(commands, 40, 735, 555, 735)
    y = 710
  }

  function pushPage() {
    pages.push(commands.join('\n'))
  }

  function addItemsHeader() {
    addPdfText(commands, 40, y, 'Produk', 9, true)
    addPdfText(commands, 350, y, 'Qty', 9, true)
    addPdfText(commands, 430, y, 'Subtotal', 9, true)
    addPdfLine(commands, 40, y - 7, 555, y - 7)
    y -= 24
  }

  function ensureSpace(space: number) {
    if (y < 80 + space) {
      pushPage()
      startPage(pages.length + 1)
      addItemsHeader()
    }
  }

  startPage(1)

  addInvoiceField(
    commands,
    40,
    y,
    'Nomor Invoice',
    order.invoice_number
  )
  addInvoiceField(
    commands,
    310,
    y,
    'Status Pembayaran',
    formatStatusLabel(order.payment_status)
  )
  y -= 42

  addInvoiceField(
    commands,
    40,
    y,
    'Tanggal Pemesanan',
    formatInvoiceDateTime(order.created_at)
  )
  addInvoiceField(
    commands,
    310,
    y,
    'Tanggal Pembayaran',
    formatInvoiceDateTime(order.paid_at)
  )
  y -= 42

  addPdfText(commands, 40, y, 'Data Pembayaran', 11, true)
  y -= 22

  addInvoiceField(
    commands,
    40,
    y,
    'Provider Pembayaran',
    order.payment_provider
      ? formatStatusLabel(order.payment_provider)
      : '-'
  )
  addInvoiceField(
    commands,
    310,
    y,
    'Jenis Pembayaran',
    order.payment_type
      ? formatStatusLabel(order.payment_type)
      : '-'
  )
  y -= 42

  addPdfText(commands, 40, y, 'Data Pelanggan', 11, true)
  y -= 22

  addInvoiceField(
    commands,
    40,
    y,
    'Nama',
    order.customer_name || '-'
  )
  addInvoiceField(
    commands,
    310,
    y,
    'Nomor Telepon',
    order.customer_phone || '-'
  )
  y -= 42

  addInvoiceField(
    commands,
    40,
    y,
    'Email',
    order.customer_email || '-',
    76
  )
  y -= 42

  addInvoiceField(
    commands,
    40,
    y,
    'Lokasi Pengambilan',
    order.location_name || '-'
  )
  addInvoiceField(
    commands,
    310,
    y,
    'Total Pembayaran',
    formatCurrency(order.total_price)
  )
  y -= 56

  addPdfText(commands, 40, y, 'Detail Produk', 11, true)
  y -= 22
  addItemsHeader()

  if (order.items.length === 0) {
    addPdfText(commands, 40, y, 'Tidak ada item.', 9)
    y -= 22
  } else {
    order.items.forEach((item) => {
      ensureSpace(30)
      addPdfText(
        commands,
        40,
        y,
        truncateText(item.product_name, 54),
        9
      )
      addPdfText(
        commands,
        350,
        y,
        String(item.quantity),
        9
      )
      addPdfText(
        commands,
        430,
        y,
        truncateText(
          formatCurrency(item.subtotal),
          22
        ),
        9
      )
      y -= 20
    })
  }

  addPdfLine(commands, 40, y, 555, y)
  y -= 22
  addPdfText(commands, 350, y, 'Total', 10, true)
  addPdfText(
    commands,
    430,
    y,
    formatCurrency(order.total_price),
    10,
    true
  )
  y -= 42
  addPdfText(
    commands,
    40,
    y,
    'Terima kasih telah berbelanja di Mr. Oey Bakery.',
    9
  )

  pushPage()

  return buildPdfBlob(
    pages,
    logoImage ? [logoImage] : []
  )
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

export default function OrderScreen() {
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] =
    useState(true)
  const [error, setError] = useState('')
  const [showFilters, setShowFilters] =
    useState(false)
  const [currentPage, setCurrentPage] =
    useState(1)
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
  const [
    downloadingInvoiceId,
    setDownloadingInvoiceId,
  ] = useState<number | null>(null)

  const fetchOrders = useCallback(async () => {
    const token = getCustomerToken()

    if (!token) {
      setError(
        'Silakan masuk terlebih dahulu untuk dapat melihat riwayat pesanan'
      )
      setOrders([])
      setLoading(false)
      return
    }

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
            'Gagal memuat order'
          )
        )
      }

      setOrders(data)
      setError('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat order'
      )
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchOrders()
  }, [fetchOrders])

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
      dateRangeFilter,
      orderStatusFilter,
      orders,
      paymentStatusFilter,
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

  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages)
    }
  }, [currentPage, totalPages])

  useEffect(() => {
    window.scrollTo({
      top: 0,
      behavior: 'smooth',
    })
  }, [currentPage])

  useAutoRefresh(fetchOrders, {
    intervalMs: 15000,
  })

  const activeFilterCount = [
    hasDateRange(dateRangeFilter),
    paymentStatusFilter !== 'all',
    orderStatusFilter !== 'all',
  ].filter(Boolean).length

  function applyFilters() {
    setDateRangeFilter(draftDateRangeFilter)
    setPaymentStatusFilter(
      draftPaymentStatusFilter
    )
    setOrderStatusFilter(
      draftOrderStatusFilter
    )
    setShowFilters(false)
    setCurrentPage(1)
  }

  function resetFilters() {
    const emptyRange = createEmptyDateRangeValue()

    setDraftDateRangeFilter(emptyRange)
    setDraftPaymentStatusFilter('all')
    setDraftOrderStatusFilter('all')
    setDateRangeFilter(emptyRange)
    setPaymentStatusFilter('all')
    setOrderStatusFilter('all')
    setShowFilters(false)
    setCurrentPage(1)
  }

  async function downloadInvoice(order: Order) {
    try {
      setDownloadingInvoiceId(order.id)

      const logoImage = await loadPdfImage(
        '/logo.png',
        'Logo'
      )
      const blob = createInvoicePdfBlob(
        order,
        logoImage
      )

      downloadBlob(
        blob,
        `Invoice ${sanitizeFileName(
          order.invoice_number
        )}.pdf`
      )
    } catch (err) {
      console.error(err)
      window.alert('Gagal membuat invoice.')
    } finally {
      setDownloadingInvoiceId(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-50 px-4 pb-12 pt-24 text-slate-900 sm:pb-16 sm:pt-28">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-orange-600">
              Orders
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl md:text-3xl">
              Pesanan Saya
            </h1>
          </div>

          <button
            type="button"
            onClick={() =>
              setShowFilters((open) => !open)
            }
            disabled={loading || Boolean(error)}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50 sm:w-auto"
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

        {!error && showFilters && (
          <div className="mt-6 rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
            <div className="grid gap-4 xl:grid-cols-3">
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
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
              >
                <Filter className="h-5 w-5" />
                Terapkan Filter
              </button>

              <button
                type="button"
                onClick={resetFilters}
                disabled={loading}
                className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 transition hover:bg-slate-50 disabled:opacity-50"
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

        {error ? (
          <div className="mt-8 rounded-lg border border-orange-200 bg-white p-6 text-center shadow-sm sm:p-8">
            <ReceiptText className="mx-auto h-12 w-12 text-orange-500" />
            <h2 className="mt-4 text-2xl font-bold">
              Pesanan Belum Dapat Ditampilkan
            </h2>
            <p className="mx-auto mt-2 max-w-xl text-slate-900">
              {error}
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
        ) : orders.length === 0 ? (
          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
            <PackageCheck className="mx-auto h-12 w-12 text-orange-500" />
            <h2 className="mt-4 text-2xl font-bold">
              Belum ada pesanan
            </h2>
            <p className="mt-2 text-slate-900">
              Checkout dari cart akan tampil di sini.
            </p>
            <Link
              href="/menu"
              className="mt-6 inline-flex items-center justify-center rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
            >
              Pilih Produk
            </Link>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="mt-8 rounded-lg border border-slate-200 bg-white p-10 text-center shadow-sm">
            <ReceiptText className="mx-auto h-12 w-12 text-orange-500" />
            <h2 className="mt-4 text-2xl font-bold">
              Tidak ada pesanan sesuai filter
            </h2>
            <p className="mt-2 text-slate-900">
              Coba pilih filter lain atau reset filter.
            </p>
          </div>
        ) : (
          <div className="mt-8 space-y-5">
            {currentOrders.map((order) => {
              const pendingPayment =
                (order.payment_status ===
                  'unpaid' ||
                  order.payment_status ===
                    'pending') &&
                order.payment_transaction_status ===
                  'pending' &&
                Boolean(order.payment_id)

              return (
            <article
                  key={order.id}
                  className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm sm:p-5"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-xl font-bold text-slate-950">
                          {order.invoice_number}
                        </h2>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(
                            order.payment_status
                          )}`}
                        >
                          {formatStatusLabel(
                            order.payment_status
                          )}
                        </span>
                        <span
                          className={`rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(
                            order.order_status
                          )}`}
                        >
                          {formatStatusLabel(
                            order.order_status
                          )}
                        </span>
                      </div>

                      <div className="mt-3 grid gap-3 text-sm text-slate-900 sm:grid-cols-3">
                        <p>
                          <span className="font-semibold text-slate-900">
                            Tanggal:
                          </span>{' '}
                          {formatDate(
                            order.created_at
                          )}
                        </p>
                        <p>
                          <span className="font-semibold text-slate-900">
                            Pengambilan:
                          </span>{' '}
                          {order.location_name || '-'}
                        </p>
                      </div>
                    </div>

                    <div className="text-left lg:text-right">
                      <p className="text-sm uppercase text-slate-900">
                        Total
                      </p>
                      <p className="text-xl font-bold text-slate-950">
                        {formatCurrency(
                          order.total_price
                        )}
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_280px]">
                    <div className="overflow-x-auto rounded-lg border border-slate-200">
                      <table className="w-full min-w-[640px] text-sm">
                        <thead className="bg-slate-100 text-left text-slate-900 font-semibold">
                          <tr>
                            <th className="px-4 py-3">
                              Produk
                            </th>
                            <th className="px-4 py-3 text-center">
                              Jumlah
                            </th>
                            <th className="px-4 py-3 text-right">
                              Subtotal
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {order.items.map(
                            (item) => (
                              <tr
                                key={item.id}
                                className="border-t border-slate-200"
                              >
                                <td className="px-4 py-3 font-semibold">
                                  {item.product_name}
                                </td>
                                <td className="px-4 py-3 text-center font-semibold">
                                  {item.quantity}
                                </td>
                                <td className="px-4 py-3 text-right font-semibold">
                                  {formatCurrency(
                                    item.subtotal
                                  )}
                                </td>
                              </tr>
                            )
                          )}
                        </tbody>
                      </table>
                    </div>

                    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-center">
                      {pendingPayment ? (
                        <>
                          <div className="flex min-h-52 flex-col items-center justify-center rounded-lg bg-white p-4">
                            <Clock3 className="mx-auto mb-2 h-5 w-5" />
                            <p className="font-semibold text-slate-900">
                              Menunggu pembayaran Midtrans
                            </p>
                            {order.payment_url && (
                              <a
                                href={order.payment_url}
                                target="_blank"
                                rel="noreferrer"
                                className="mt-4 inline-flex items-center justify-center rounded-lg bg-orange-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-orange-600"
                              >
                                Lanjutkan Pembayaran
                              </a>
                            )}
                          </div>
                          {order.payment_expires_at && (
                            <p className="mt-3 text-xs font-medium text-slate-900">
                              Batas bayar:{' '}
                              {formatDate(
                                order.payment_expires_at
                              )}
                            </p>
                          )}
                        </>
                      ) : (
                        <div className="flex min-h-52 flex-col items-center justify-center">
                          {order.payment_status ===
                          'paid' ? (
                            <CheckCircle2 className="h-12 w-12 text-emerald-600" />
                          ) : (
                            <Clock3 className="h-12 w-12 text-amber-600" />
                          )}
                          <p className="mt-3 font-semibold capitalize text-slate-800">
                            {formatStatusLabel(
                              order.payment_status
                            )}
                          </p>
                          <p className="mt-1 text-sm text-slate-900">
                            Dibayar:{' '}
                            {formatDate(
                              order.paid_at
                            )}
                          </p>
                        </div>
                      )}

                      <button
                        type="button"
                        onClick={() => {
                          void downloadInvoice(order)
                        }}
                        disabled={
                          downloadingInvoiceId ===
                          order.id
                        }
                        className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg border border-orange-200 bg-white px-4 py-2 text-sm font-semibold text-orange-600 transition hover:bg-orange-50 disabled:opacity-50"
                      >
                        {downloadingInvoiceId ===
                        order.id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <FileDown className="h-4 w-4" />
                        )}
                        Unduh Invoice
                      </button>
                    </div>
                  </div>
                </article>
              )
            })}

            {filteredOrders.length > ordersPerPage && (
              <div className="flex flex-wrap justify-center gap-3 pt-10">
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
                    disabled:opacity-40
                  "
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
                    disabled:opacity-40
                  "
                >
                  &rarr;
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </main>
  )
}
