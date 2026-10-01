'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  BarChart3,
  CreditCard,
  FileSpreadsheet,
  FileText,
  Filter,
  Loader2,
  ReceiptText,
  RotateCcw,
  ShoppingCart,
  Trophy,
  Wallet,
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
  paid_at: string | null
  created_at: string
  transaction_id: string | null
  payment_provider: string | null
  payment_type: string | null
  payment_transaction_status: string | null
  payment_expires_at: string | null
  items: OrderItem[]
}

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
}

type ProductSummary = {
  name: string
  quantity: number
  orderCount: number
  revenue: number
}

type PdfImage = {
  name: string
  width: number
  height: number
  dataHex: string
}

const reportsPerPage = 10

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

const productRankOptions = [
  {
    value: 'all',
    label: 'Semua Produk',
  },
  {
    value: '5',
    label: 'Top 5 Produk',
  },
  {
    value: '10',
    label: 'Top 10 Produk',
  },
  {
    value: '20',
    label: 'Top 20 Produk',
  },
] as const

type PaymentStatusFilter =
  (typeof paymentStatusOptions)[number]['value']

type OrderStatusFilter =
  (typeof orderStatusOptions)[number]['value']

type ProductRankFilter =
  (typeof productRankOptions)[number]['value']

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

function formatExportInputDate(
  value: string | null,
  fallback: string
) {
  if (!value) {
    return fallback
  }

  const [year, month, day] = value
    .split('-')
    .map(Number)

  if (!year || !month || !day) {
    return fallback
  }

  return `${String(day).padStart(2, '0')}-${String(
    month
  ).padStart(2, '0')}-${year}`
}

function formatExportDateTime(
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

async function readJson<T>(
  response: Response,
  fallback: string
) {
  const data = await response.json()

  if (!response.ok) {
    throw new Error(
      getErrorMessage(data, fallback)
    )
  }

  return data as T
}

function getPaymentStatus(
  order: AdminOrder,
  payment?: AdminPayment
) {
  return payment?.status || order.payment_status
}

function getPaymentProvider(
  order: AdminOrder,
  payment?: AdminPayment
) {
  return (
    payment?.payment_provider ||
    order.payment_provider ||
    order.payment_method ||
    '-'
  )
}

function getPaymentType(
  order: AdminOrder,
  payment?: AdminPayment
) {
  return payment?.payment_type || order.payment_type
}

function getTransactionId(
  order: AdminOrder,
  payment?: AdminPayment
) {
  return (
    payment?.transaction_id ||
    order.transaction_id ||
    '-'
  )
}

function getPaidAt(
  order: AdminOrder,
  payment?: AdminPayment
) {
  return (
    payment?.paid_at ||
    payment?.settlement_time ||
    order.paid_at ||
    null
  )
}

function getPaymentTransactionStatus(
  order: AdminOrder,
  payment?: AdminPayment
) {
  return (
    payment?.transaction_status ||
    order.payment_transaction_status ||
    '-'
  )
}

function getPaymentAmount(
  order: AdminOrder,
  payment?: AdminPayment
) {
  return Number(
    payment?.amount ?? order.total_price ?? 0
  )
}

function escapeXml(value: string | number | null) {
  return String(value ?? '-')
    .replace(
      /[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g,
      ''
    )
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
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

function getExportFileName(extension: string) {
  const now = new Date()

  const day = String(now.getDate()).padStart(2, '0')
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const year = now.getFullYear()

  return `Laporan Penjualan Mr. Oey Bakery ${day}-${month}-${year}.${extension}`
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
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 842 595] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> ${imageResources} >> /Contents ${contentObject} 0 R >>`
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

function getFilterDescription(
  dateRange: DateRangeValue,
  paymentStatus: PaymentStatusFilter,
  orderStatus: OrderStatusFilter
) {
  const parts = [
    hasDateRange(dateRange)
      ? `${formatExportInputDate(
          dateRange.startDate,
          'Awal'
        )} ${dateRange.startTime} sampai ${formatExportInputDate(
          dateRange.endDate,
          'Akhir'
        )} ${dateRange.endTime}`
      : 'Semua Periode',
    `Pembayaran: ${formatStatusLabel(
      paymentStatus
    )}`,
    `Pesanan: ${formatStatusLabel(
      orderStatus
    )}`,
  ]

  return parts.join(' | ')
}

function createProductText(order: AdminOrder) {
  if (order.items.length === 0) {
    return '-'
  }

  return order.items
    .map(
      (item) =>
        `${item.quantity}x ${item.product_name}`
    )
    .join(', ')
}

type XlsxCell = {
  value: string | number | null
  style?: number
}

type ZipFile = {
  path: string
  content: string
}

const XLSX_STYLE_TITLE = 1
const XLSX_STYLE_HEADER = 2
const XLSX_STYLE_CURRENCY = 3
const XLSX_STYLE_BOLD = 4
const XLSX_STYLE_BODY = 5

const textEncoder = new TextEncoder()

function createCrcTable() {
  const table = new Uint32Array(256)

  for (let index = 0; index < 256; index += 1) {
    let current = index

    for (let bit = 0; bit < 8; bit += 1) {
      current =
        current & 1
          ? 0xedb88320 ^ (current >>> 1)
          : current >>> 1
    }

    table[index] = current >>> 0
  }

  return table
}

const crcTable = createCrcTable()

function getCrc32(data: Uint8Array) {
  let crc = 0xffffffff

  for (let index = 0; index < data.length; index += 1) {
    crc =
      (crc >>> 8) ^
      crcTable[(crc ^ data[index]) & 0xff]
  }

  return (crc ^ 0xffffffff) >>> 0
}

function writeUint16(
  target: Uint8Array,
  offset: number,
  value: number
) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
}

function writeUint32(
  target: Uint8Array,
  offset: number,
  value: number
) {
  target[offset] = value & 0xff
  target[offset + 1] = (value >>> 8) & 0xff
  target[offset + 2] = (value >>> 16) & 0xff
  target[offset + 3] = (value >>> 24) & 0xff
}

function createLocalZipHeader(
  fileName: Uint8Array,
  crc: number,
  size: number
) {
  const header = new Uint8Array(
    30 + fileName.length
  )

  writeUint32(header, 0, 0x04034b50)
  writeUint16(header, 4, 20)
  writeUint16(header, 6, 0x0800)
  writeUint16(header, 8, 0)
  writeUint16(header, 10, 0)
  writeUint16(header, 12, 0)
  writeUint32(header, 14, crc)
  writeUint32(header, 18, size)
  writeUint32(header, 22, size)
  writeUint16(header, 26, fileName.length)
  writeUint16(header, 28, 0)
  header.set(fileName, 30)

  return header
}

function createCentralZipHeader(
  fileName: Uint8Array,
  crc: number,
  size: number,
  localHeaderOffset: number
) {
  const header = new Uint8Array(
    46 + fileName.length
  )

  writeUint32(header, 0, 0x02014b50)
  writeUint16(header, 4, 20)
  writeUint16(header, 6, 20)
  writeUint16(header, 8, 0x0800)
  writeUint16(header, 10, 0)
  writeUint16(header, 12, 0)
  writeUint16(header, 14, 0)
  writeUint32(header, 16, crc)
  writeUint32(header, 20, size)
  writeUint32(header, 24, size)
  writeUint16(header, 28, fileName.length)
  writeUint16(header, 30, 0)
  writeUint16(header, 32, 0)
  writeUint16(header, 34, 0)
  writeUint16(header, 36, 0)
  writeUint32(header, 38, 0)
  writeUint32(header, 42, localHeaderOffset)
  header.set(fileName, 46)

  return header
}

function toBlobPart(bytes: Uint8Array): ArrayBuffer {
  const buffer = new ArrayBuffer(
    bytes.byteLength
  )

  new Uint8Array(buffer).set(bytes)

  return buffer
}

function buildZipBlob(files: ZipFile[]) {
  const localParts: Uint8Array[] = []
  const centralParts: Uint8Array[] = []
  let offset = 0

  files.forEach((file) => {
    const fileName = textEncoder.encode(file.path)
    const data = textEncoder.encode(file.content)
    const crc = getCrc32(data)
    const localHeader = createLocalZipHeader(
      fileName,
      crc,
      data.length
    )
    const centralHeader = createCentralZipHeader(
      fileName,
      crc,
      data.length,
      offset
    )

    localParts.push(localHeader, data)
    centralParts.push(centralHeader)
    offset += localHeader.length + data.length
  })

  const centralDirectoryOffset = offset
  const centralDirectorySize =
    centralParts.reduce(
      (sum, part) => sum + part.length,
      0
    )
  const endOfCentralDirectory = new Uint8Array(22)

  writeUint32(endOfCentralDirectory, 0, 0x06054b50)
  writeUint16(endOfCentralDirectory, 4, 0)
  writeUint16(endOfCentralDirectory, 6, 0)
  writeUint16(
    endOfCentralDirectory,
    8,
    files.length
  )
  writeUint16(
    endOfCentralDirectory,
    10,
    files.length
  )
  writeUint32(
    endOfCentralDirectory,
    12,
    centralDirectorySize
  )
  writeUint32(
    endOfCentralDirectory,
    16,
    centralDirectoryOffset
  )
  writeUint16(endOfCentralDirectory, 20, 0)

  return new Blob(
    [
      ...localParts,
      ...centralParts,
      endOfCentralDirectory,
    ].map(toBlobPart),
    {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    }
  )
}

function getColumnName(column: number) {
  let name = ''
  let current = column

  while (current > 0) {
    const remainder = (current - 1) % 26
    name =
      String.fromCharCode(65 + remainder) + name
    current = Math.floor((current - 1) / 26)
  }

  return name
}

function createXlsxCellXml(
  cell: XlsxCell,
  rowNumber: number,
  columnNumber: number
) {
  const ref = `${getColumnName(
    columnNumber
  )}${rowNumber}`
  const style = cell.style ?? 0

  if (
    typeof cell.value === 'number' &&
    Number.isFinite(cell.value)
  ) {
    return `<c r="${ref}" s="${style}"><v>${cell.value}</v></c>`
  }

  return `<c r="${ref}" s="${style}" t="inlineStr"><is><t>${escapeXml(
    cell.value
  )}</t></is></c>`
}

function createXlsxWorksheetXml(rows: XlsxCell[][]) {
  const maxColumns = Math.max(
    1,
    ...rows.map((row) => row.length)
  )
  const maxRows = Math.max(1, rows.length)
  const dimension = `A1:${getColumnName(
    maxColumns
  )}${maxRows}`
  const columnWidths = [
    22, 22, 24, 30, 18, 22, 42, 16, 18, 18,
    28, 18, 20, 20, 22,
  ]
  const cols = columnWidths
    .map(
      (width, index) =>
        `<col min="${index + 1}" max="${index + 1}" width="${width}" customWidth="1"/>`
    )
    .join('')
  const sheetRows = rows
    .map(
      (row, rowIndex) =>
        `<row r="${rowIndex + 1}">${row
          .map((cell, cellIndex) =>
            createXlsxCellXml(
              cell,
              rowIndex + 1,
              cellIndex + 1
            )
          )
          .join('')}</row>`
    )
    .join('')

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <dimension ref="${dimension}"/>
  <sheetViews>
    <sheetView workbookViewId="0"/>
  </sheetViews>
  <sheetFormatPr defaultRowHeight="15"/>
  <cols>${cols}</cols>
  <sheetData>${sheetRows}</sheetData>
  <pageMargins left="0.7" right="0.7" top="0.75" bottom="0.75" header="0.3" footer="0.3"/>
</worksheet>`
}

function createXlsxRows(
  orderRows: AdminOrder[],
  paymentsByOrderId: Map<number, AdminPayment>,
  topProducts: ProductSummary[],
  dateRange: DateRangeValue,
  paymentStatus: PaymentStatusFilter,
  orderStatus: OrderStatusFilter,
  revenue: number
) {
  const rows: XlsxCell[][] = [
    [
      {
        value: 'Laporan Penjualan Mr. Oey Bakery',
        style: XLSX_STYLE_TITLE,
      },
    ],
    [
      {
        value: getFilterDescription(
          dateRange,
          paymentStatus,
          orderStatus
        ),
        style: XLSX_STYLE_BODY,
      },
    ],
    [],
    [
      {
        value: 'Total Pesanan',
        style: XLSX_STYLE_HEADER,
      },
      {
        value: 'Pendapatan',
        style: XLSX_STYLE_HEADER,
      },
    ],
    [
      {
        value: orderRows.length,
        style: XLSX_STYLE_BODY,
      },
      {
        value: revenue,
        style: XLSX_STYLE_CURRENCY,
      },
    ],
    [],
    [
      {
        value: 'Produk Terlaris',
        style: XLSX_STYLE_BOLD,
      },
    ],
    [
      'Ranking',
      'Produk',
      'Qty Terjual',
      'Jumlah Pesanan',
      'Pendapatan Produk',
    ].map((value) => ({
      value,
      style: XLSX_STYLE_HEADER,
    })),
  ]

  if (topProducts.length === 0) {
    rows.push([
      {
        value: 'Tidak ada data produk',
        style: XLSX_STYLE_BODY,
      },
    ])
  } else {
    topProducts.forEach((product, index) => {
      rows.push([
        {
          value: index + 1,
          style: XLSX_STYLE_BODY,
        },
        {
          value: product.name,
          style: XLSX_STYLE_BODY,
        },
        {
          value: product.quantity,
          style: XLSX_STYLE_BODY,
        },
        {
          value: product.orderCount,
          style: XLSX_STYLE_BODY,
        },
        {
          value: product.revenue,
          style: XLSX_STYLE_CURRENCY,
        },
      ])
    })
  }

  rows.push(
    [],
    [
      {
        value: 'Daftar Laporan',
        style: XLSX_STYLE_BOLD,
      },
    ],
    [
      'Faktur',
      'Tanggal Pesanan',
      'Pelanggan',
      'Email',
      'Telepon',
      'Lokasi',
      'Produk',
      'Total',
      'Penyedia',
      'Tipe Pembayaran',
      'Transaksi',
      'Status Midtrans',
      'Status Pembayaran',
      'Status Pesanan',
      'Tanggal Bayar',
    ].map((value) => ({
      value,
      style: XLSX_STYLE_HEADER,
    }))
  )

  if (orderRows.length === 0) {
    rows.push([
      {
        value: 'Tidak ada laporan sesuai filter',
        style: XLSX_STYLE_BODY,
      },
    ])
  } else {
    orderRows.forEach((order) => {
      const payment = paymentsByOrderId.get(order.id)

      rows.push([
        {
          value: order.invoice_number,
          style: XLSX_STYLE_BODY,
        },
        {
          value: formatExportDateTime(
            order.created_at
          ),
          style: XLSX_STYLE_BODY,
        },
        {
          value: order.customer_name,
          style: XLSX_STYLE_BODY,
        },
        {
          value: order.customer_email,
          style: XLSX_STYLE_BODY,
        },
        {
          value: order.customer_phone || '-',
          style: XLSX_STYLE_BODY,
        },
        {
          value: order.location_name || '-',
          style: XLSX_STYLE_BODY,
        },
        {
          value: createProductText(order),
          style: XLSX_STYLE_BODY,
        },
        {
          value: order.total_price,
          style: XLSX_STYLE_CURRENCY,
        },
        {
          value: getPaymentProvider(
            order,
            payment
          ),
          style: XLSX_STYLE_BODY,
        },
        {
          value:
            getPaymentType(order, payment) || '-',
          style: XLSX_STYLE_BODY,
        },
        {
          value: getTransactionId(
            order,
            payment
          ),
          style: XLSX_STYLE_BODY,
        },
        {
          value: getPaymentTransactionStatus(
            order,
            payment
          ),
          style: XLSX_STYLE_BODY,
        },
        {
          value: formatStatusLabel(
            getPaymentStatus(order, payment)
          ),
          style: XLSX_STYLE_BODY,
        },
        {
          value: formatStatusLabel(
            order.order_status
          ),
          style: XLSX_STYLE_BODY,
        },
        {
          value: formatExportDateTime(
            getPaidAt(order, payment)
          ),
          style: XLSX_STYLE_BODY,
        },
      ])
    })
  }

  return rows
}

function createXlsxStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">
  <numFmts count="1">
    <numFmt numFmtId="164" formatCode="&quot;Rp&quot; #,##0"/>
  </numFmts>
  <fonts count="4">
    <font><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="14"/><name val="Calibri"/></font>
    <font><b/><color rgb="FFFFFFFF"/><sz val="11"/><name val="Calibri"/></font>
    <font><b/><sz val="11"/><name val="Calibri"/></font>
  </fonts>
  <fills count="3">
    <fill><patternFill patternType="none"/></fill>
    <fill><patternFill patternType="gray125"/></fill>
    <fill><patternFill patternType="solid"><fgColor rgb="FF0F172A"/><bgColor indexed="64"/></patternFill></fill>
  </fills>
  <borders count="2">
    <border><left/><right/><top/><bottom/><diagonal/></border>
    <border>
      <left style="thin"><color rgb="FFE2E8F0"/></left>
      <right style="thin"><color rgb="FFE2E8F0"/></right>
      <top style="thin"><color rgb="FFE2E8F0"/></top>
      <bottom style="thin"><color rgb="FFE2E8F0"/></bottom>
      <diagonal/>
    </border>
  </borders>
  <cellStyleXfs count="1">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0"/>
  </cellStyleXfs>
  <cellXfs count="6">
    <xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>
    <xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/>
    <xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"><alignment horizontal="center"/></xf>
    <xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="3" fillId="0" borderId="1" xfId="0" applyFont="1" applyBorder="1"/>
    <xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>
  </cellXfs>
  <cellStyles count="1">
    <cellStyle name="Normal" xfId="0" builtinId="0"/>
  </cellStyles>
  <dxfs count="0"/>
  <tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>
</styleSheet>`
}

function createXlsxBlob(
  rows: AdminOrder[],
  paymentsByOrderId: Map<number, AdminPayment>,
  topProducts: ProductSummary[],
  dateRange: DateRangeValue,
  paymentStatus: PaymentStatusFilter,
  orderStatus: OrderStatusFilter,
  revenue: number
) {
  const worksheetRows = createXlsxRows(
    rows,
    paymentsByOrderId,
    topProducts,
    dateRange,
    paymentStatus,
    orderStatus,
    revenue
  )

  return buildZipBlob([
    {
      path: '[Content_Types].xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
  <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
  <Default Extension="xml" ContentType="application/xml"/>
  <Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>
  <Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>
  <Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>
</Types>`,
    },
    {
      path: '_rels/.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>
</Relationships>`,
    },
    {
      path: 'xl/workbook.xml',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
  <sheets>
    <sheet name="Laporan" sheetId="1" r:id="rId1"/>
  </sheets>
</workbook>`,
    },
    {
      path: 'xl/_rels/workbook.xml.rels',
      content: `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
  <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>
  <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
</Relationships>`,
    },
    {
      path: 'xl/styles.xml',
      content: createXlsxStylesXml(),
    },
    {
      path: 'xl/worksheets/sheet1.xml',
      content:
        createXlsxWorksheetXml(worksheetRows),
    },
  ])
}

function createPdfBlob(
  rows: AdminOrder[],
  paymentsByOrderId: Map<number, AdminPayment>,
  topProducts: ProductSummary[],
  filterDescription: string,
  revenue: number,
  logoImage: PdfImage | null
) {
  const pages: string[] = []
  let commands: string[] = []
  let y = 555

  function startPage(pageNumber: number) {
    commands = []
    y = 555

    addPdfText(
      commands,
      32,
      y,
      'Laporan Penjualan Mr. Oey Bakery',
      16,
      true
    )
    addPdfText(
      commands,
      32,
      y - 18,
      `Halaman ${pageNumber}`,
      8
    )
    addPdfText(
      commands,
      32,
      y - 32,
      truncateText(filterDescription, 125),
      8
    )

    if (logoImage) {
      const logoWidth = 54
      const logoHeight = getPdfImageHeight(
        logoImage,
        logoWidth
      )

      addPdfImage(
        commands,
        logoImage.name,
        756,
        526,
        logoWidth,
        logoHeight
      )
    }

    addPdfLine(commands, 32, y - 42, 810, y - 42)
    y -= 62
  }

  function pushPage() {
    pages.push(commands.join('\n'))
  }

  function ensureSpace(space: number) {
    if (y < 45 + space) {
      pushPage()
      startPage(pages.length + 1)
    }
  }

  startPage(1)

  addPdfText(
    commands,
    32,
    y,
    `Total pesanan: ${rows.length}`,
    10,
    true
  )
  addPdfText(
    commands,
    190,
    y,
    `Pendapatan: ${formatCurrency(revenue)}`,
    10,
    true
  )
  y -= 22

  addPdfText(
    commands,
    32,
    y,
    'Produk terlaris',
    11,
    true
  )
  y -= 16

  if (topProducts.length === 0) {
    addPdfText(
      commands,
      32,
      y,
      'Belum ada produk pada filter ini.',
      9
    )
    y -= 16
  } else {
    topProducts.slice(0, 5).forEach((product, index) => {
      addPdfText(
        commands,
        32,
        y,
        `${index + 1}. ${truncateText(
          product.name,
          42
        )}`,
        9
      )
      addPdfText(
        commands,
        330,
        y,
        `Qty ${product.quantity}`,
        9
      )
      addPdfText(
        commands,
        410,
        y,
        `${product.orderCount} pesanan`,
        9
      )
      addPdfText(
        commands,
        520,
        y,
        formatCurrency(product.revenue),
        9
      )
      y -= 14
    })
  }

  y -= 12

  addPdfText(commands, 32, y, 'Faktur', 8, true)
  addPdfText(commands, 118, y, 'Tanggal Pesanan', 8, true)
  addPdfText(commands, 210, y, 'Pelanggan', 8, true)
  addPdfText(commands, 330, y, 'Produk', 8, true)
  addPdfText(commands, 510, y, 'Total', 8, true)
  addPdfText(commands, 600, y, 'Status Pembayaran', 8, true)
  addPdfText(commands, 695, y, 'Status Pesanan', 8, true)
  addPdfLine(commands, 32, y - 5, 810, y - 5)
  y -= 20

  if (rows.length === 0) {
    addPdfText(
      commands,
      32,
      y,
      'Tidak ada laporan sesuai filter.',
      9
    )
  }

  rows.forEach((order) => {
    const payment = paymentsByOrderId.get(order.id)
    const products = createProductText(order)

    ensureSpace(34)
    addPdfText(
      commands,
      32,
      y,
      truncateText(order.invoice_number, 18),
      8,
      true
    )
    addPdfText(
      commands,
      118,
      y,
      truncateText(
        formatExportDateTime(order.created_at),
        20
      ),
      8
    )
    addPdfText(
      commands,
      210,
      y,
      truncateText(order.customer_name, 24),
      8
    )
    addPdfText(
      commands,
      330,
      y,
      truncateText(products, 36),
      8
    )
    addPdfText(
      commands,
      510,
      y,
      truncateText(
        formatCurrency(order.total_price),
        17
      ),
      8
    )
    addPdfText(
      commands,
      600,
      y,
      truncateText(
        formatStatusLabel(
          getPaymentStatus(order, payment)
        ),
        18
      ),
      8
    )
    addPdfText(
      commands,
      695,
      y,
      truncateText(
        formatStatusLabel(order.order_status),
        18
      ),
      8
    )

    y -= 13
    addPdfText(
      commands,
      32,
      y,
      truncateText(
        `${getPaymentProvider(
          order,
          payment
        )} ${getPaymentType(order, payment) || ''}`,
        42
      ),
      7
    )
    addPdfText(
      commands,
      330,
      y,
      `Paid: ${truncateText(
        formatExportDateTime(
          getPaidAt(order, payment)
        ),
        24
      )}`,
      7
    )
    addPdfText(
      commands,
      510,
      y,
      `Trx: ${truncateText(
        getTransactionId(order, payment),
        34
      )}`,
      7
    )
    addPdfLine(commands, 32, y - 6, 810, y - 6)
    y -= 18
  })

  pushPage()

  return buildPdfBlob(
    pages,
    logoImage ? [logoImage] : []
  )
}

export default function AdminReportsPage() {
  const [orders, setOrders] =
    useState<AdminOrder[]>([])
  const [payments, setPayments] =
    useState<AdminPayment[]>([])
  const [loading, setLoading] =
    useState(true)
  const [error, setError] = useState('')
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
  const [
    productRankFilter,
    setProductRankFilter,
  ] = useState<ProductRankFilter>('all')
  const [
    draftProductRankFilter,
    setDraftProductRankFilter,
  ] = useState<ProductRankFilter>('all')
  const [currentPage, setCurrentPage] =
    useState(1)

  const paymentsByOrderId = useMemo(() => {
    const map = new Map<number, AdminPayment>()

    payments.forEach((payment) => {
      if (!map.has(payment.order_id)) {
        map.set(payment.order_id, payment)
      }
    })

    return map
  }, [payments])

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) => {
        const payment = paymentsByOrderId.get(
          order.id
        )
        const paymentStatus = getPaymentStatus(
          order,
          payment
        )

        return (
          isDateInRange(
            order.created_at,
            dateRangeFilter
          ) &&
          matchesPaymentStatus(
            paymentStatus,
            paymentStatusFilter
          ) &&
          (orderStatusFilter === 'all' ||
            order.order_status ===
              orderStatusFilter)
        )
      }),
    [
      orders,
      paymentsByOrderId,
      dateRangeFilter,
      paymentStatusFilter,
      orderStatusFilter,
    ]
  )

  const revenue = useMemo(
    () =>
      filteredOrders
        .filter(
          (order) =>
            getPaymentStatus(
              order,
              paymentsByOrderId.get(order.id)
            ) === 'paid'
        )
        .reduce(
          (sum, order) =>
            sum +
            getPaymentAmount(
              order,
              paymentsByOrderId.get(order.id)
            ),
          0
        ),
    [filteredOrders, paymentsByOrderId]
  )

  const paidOrdersCount = useMemo(
    () =>
      filteredOrders.filter(
        (order) =>
          getPaymentStatus(
            order,
            paymentsByOrderId.get(order.id)
          ) === 'paid'
      ).length,
    [filteredOrders, paymentsByOrderId]
  )

  const productSummaries = useMemo(() => {
    const summaries = new Map<
      string,
      ProductSummary
    >()

    filteredOrders.forEach((order) => {
      const productsInOrder = new Set<string>()

      order.items.forEach((item) => {
        const name =
          item.product_name || 'Produk Tanpa Nama'
        const current =
          summaries.get(name) || {
            name,
            quantity: 0,
            orderCount: 0,
            revenue: 0,
          }

        current.quantity += Number(
          item.quantity || 0
        )
        current.revenue += Number(
          item.subtotal || 0
        )
        summaries.set(name, current)
        productsInOrder.add(name)
      })

      productsInOrder.forEach((name) => {
        const current = summaries.get(name)

        if (current) {
          current.orderCount += 1
        }
      })
    })

    return Array.from(summaries.values()).sort(
      (left, right) =>
        right.quantity - left.quantity ||
        right.orderCount - left.orderCount ||
        right.revenue - left.revenue
    )
  }, [filteredOrders])

  const visibleProductSummaries = useMemo(() => {
    if (productRankFilter === 'all') {
      return productSummaries
    }

    return productSummaries.slice(
      0,
      Number(productRankFilter)
    )
  }, [productRankFilter, productSummaries])

  const bestProduct =
    productSummaries[0] || null

  const totalPages = Math.max(
    1,
    Math.ceil(
      filteredOrders.length / reportsPerPage
    )
  )

  const currentReports = useMemo(() => {
    const indexOfLastReport =
      currentPage * reportsPerPage
    const indexOfFirstReport =
      indexOfLastReport - reportsPerPage

    return filteredOrders.slice(
      indexOfFirstReport,
      indexOfLastReport
    )
  }, [currentPage, filteredOrders])

  const activeFilterCount = [
    hasDateRange(dateRangeFilter),
    paymentStatusFilter !== 'all',
    orderStatusFilter !== 'all',
    productRankFilter !== 'all',
  ].filter(Boolean).length

  async function fetchReports(showLoading = true) {
    const token = getAdminToken()

    try {
      if (showLoading) {
        setLoading(true)
      }

      const [orderRes, paymentRes] =
        await Promise.all([
          fetch('/api/orders', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
          fetch('/api/payments', {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          }),
        ])

      const [orderData, paymentData] =
        await Promise.all([
          readJson<AdminOrder[]>(
            orderRes,
            'Gagal memuat orders'
          ),
          readJson<AdminPayment[]>(
            paymentRes,
            'Gagal memuat payments'
          ),
        ])

      setOrders(
        Array.isArray(orderData) ? orderData : []
      )
      setPayments(
        Array.isArray(paymentData)
          ? paymentData
          : []
      )
      setError('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat laporan'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchReports()
  }, [])

  useAutoRefresh(() => fetchReports(false), {
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
    setProductRankFilter(
      draftProductRankFilter
    )
    setCurrentPage(1)
  }

  function resetFilters() {
    setDraftDateRangeFilter(
      createEmptyDateRangeValue()
    )
    setDraftPaymentStatusFilter('all')
    setDraftOrderStatusFilter('all')
    setDraftProductRankFilter('all')
    setDateRangeFilter(
      createEmptyDateRangeValue()
    )
    setPaymentStatusFilter('all')
    setOrderStatusFilter('all')
    setProductRankFilter('all')
    setCurrentPage(1)
  }

  function exportExcel() {
    const blob = createXlsxBlob(
      filteredOrders,
      paymentsByOrderId,
      visibleProductSummaries,
      dateRangeFilter,
      paymentStatusFilter,
      orderStatusFilter,
      revenue
    )

    downloadBlob(
      blob,
      getExportFileName('xlsx')
    )
  }

  async function exportPdf() {
    const filterDescription =
      getFilterDescription(
        dateRangeFilter,
        paymentStatusFilter,
        orderStatusFilter
      )
    const logoImage = await loadPdfImage(
      '/logo.png',
      'Logo'
    )
    const blob = createPdfBlob(
      filteredOrders,
      paymentsByOrderId,
      visibleProductSummaries,
      filterDescription,
      revenue,
      logoImage
    )

    downloadBlob(
      blob,
      getExportFileName('pdf')
    )
  }

  const cards = [
    {
      title: 'Pesanan Masuk',
      value: filteredOrders.length.toLocaleString(
        'id-ID'
      ),
      helper: 'Total pesanan sesuai filter',
      icon: ShoppingCart,
      color: 'bg-orange-50 text-orange-600',
    },
    {
      title: 'Pendapatan',
      value: formatCurrency(revenue),
      helper: 'Dari pembayaran paid',
      icon: Wallet,
      color: 'bg-emerald-50 text-emerald-600',
    },
    {
      title: 'Pesanan Lunas',
      value: paidOrdersCount.toLocaleString(
        'id-ID'
      ),
      helper: 'Status pembayaran paid',
      icon: CreditCard,
      color: 'bg-sky-50 text-sky-600',
    },
    {
      title: 'Produk Terlaris',
      value: bestProduct
        ? bestProduct.name
        : '-',
      helper: bestProduct
        ? `${bestProduct.quantity.toLocaleString(
            'id-ID'
          )} item terjual`
        : 'Belum ada data produk',
      icon: Trophy,
      color: 'bg-amber-50 text-amber-600',
    },
  ]

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8 flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
          <div>
            <p className="text-sm font-semibold uppercase text-orange-600">
              Admin
            </p>
            <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
              Manajemen Laporan
            </h1>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row">
            <button
              type="button"
              onClick={exportExcel}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-emerald-200 bg-white px-5 py-3 font-semibold text-emerald-700 transition hover:bg-emerald-50 disabled:opacity-50"
            >
              <FileSpreadsheet className="h-5 w-5" />
              Export XLSX
            </button>

            <button
              type="button"
              onClick={exportPdf}
              disabled={loading}
              className="inline-flex items-center justify-center gap-2 rounded-lg border border-red-200 bg-white px-5 py-3 font-semibold text-red-700 transition hover:bg-red-50 disabled:opacity-50"
            >
              <FileText className="h-5 w-5" />
              Export PDF
            </button>

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
        </div>

        {showFilters && (
          <div className="mb-6 rounded-lg bg-white p-5 shadow-sm">
            <div className="grid gap-4 xl:grid-cols-4">
              <div className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  Periode Laporan
                </span>
                <DateRangePicker
                  value={draftDateRangeFilter}
                  onChange={
                    setDraftDateRangeFilter
                  }
                  ariaLabel="Pilih periode laporan"
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

              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-slate-900">
                  Produk Terlaris
                </span>
                <select
                  value={draftProductRankFilter}
                  onChange={(event) =>
                    setDraftProductRankFilter(
                      event.target
                        .value as ProductRankFilter
                    )
                  }
                  className="h-12 w-full rounded-lg border border-slate-300 bg-white px-3 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                >
                  {productRankOptions.map(
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
                      <div className="min-w-0">
                        <p className="text-lg font-semibold uppercase text-slate-900">
                          {card.title}
                        </p>
                        <h2 className="mt-3 break-words text-2xl font-bold text-slate-950">
                          {card.value}
                        </h2>
                        <p className="mt-2 text-slate-900">
                          {card.helper}
                        </p>
                      </div>

                      <div
                        className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-lg ${card.color}`}
                      >
                        <Icon className="h-6 w-6" />
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 grid gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="rounded-lg bg-white shadow-sm">
                <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-orange-600">
                      Daftar Laporan
                    </h2>
                  </div>

                  <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
                    {filteredOrders.length.toLocaleString(
                      'id-ID'
                    )}{' '}
                    Laporan
                  </div>
                </div>

                {filteredOrders.length === 0 ? (
                  <div className="p-10 text-center">
                    <ReceiptText className="mx-auto h-12 w-12 text-orange-500" />
                    <h3 className="mt-4 text-2xl font-bold">
                      Tidak ditemukan laporan
                    </h3>
                  </div>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
                      <table className="w-full min-w-[1780px]">
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
                              Status Pembayaran
                            </th>
                            <th className="px-4 py-3">
                              Status Pesanan
                            </th>
                            <th className="px-4 py-3">
                              Tanggal Bayar
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                          {currentReports.map(
                            (order) => {
                              const payment =
                                paymentsByOrderId.get(
                                  order.id
                                )
                              const paymentStatus =
                                getPaymentStatus(
                                  order,
                                  payment
                                )

                              return (
                                <tr
                                  key={order.id}
                                  className="border-b border-slate-200 align-middle text-center hover:bg-slate-50"
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
                                    <p className="mt-1 text-sm text-slate-900">
                                      {order.location_name ||
                                        '-'}
                                    </p>
                                  </td>
                                  <td className="px-4 py-4">
                                    <p className="font-semibold">
                                      {
                                        order.customer_name
                                      }
                                    </p>
                                    <p className="mt-1 text-sm text-slate-900">
                                      {
                                        order.customer_email
                                      }
                                    </p>
                                    <p className="mt-1 text-sm text-slate-900">
                                      {order.customer_phone ||
                                        '-'}
                                    </p>
                                  </td>
                                  <td className="px-4 py-4">
                                    <div className="max-w-xs space-y-1 text-left">
                                      {order.items.map(
                                        (item) => (
                                          <p
                                            key={item.id}
                                            className="text-slate-900"
                                          >
                                            {item.quantity}
                                            x{' '}
                                            {
                                              item.product_name
                                            }
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
                                    <p className="font-semibold uppercase">
                                      {getPaymentProvider(
                                        order,
                                        payment
                                      )}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-900 uppercase">
                                      {formatStatusLabel(
                                        getPaymentType(
                                          order,
                                          payment
                                        ) || '-'
                                      )}
                                    </p>
                                    <p className="mt-1 break-all text-sm text-slate-900">
                                      {getTransactionId(
                                        order,
                                        payment
                                      )}
                                    </p>
                                    <p className="mt-1 text-sm text-slate-900">
                                      Midtrans:{' '}
                                      {getPaymentTransactionStatus(
                                        order,
                                        payment
                                      )}
                                    </p>
                                  </td>
                                  <td className="px-4 py-4">
                                    <span
                                      className={`inline-flex rounded-full border px-3 py-1 text-xs font-semibold capitalize ${getStatusClass(
                                        paymentStatus
                                      )}`}
                                    >
                                      {formatStatusLabel(
                                        paymentStatus
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
                                  <td className="px-4 py-4 text-sm font-semibold">
                                    {formatDate(
                                      getPaidAt(
                                        order,
                                        payment
                                      )
                                    )}
                                  </td>
                                </tr>
                              )
                            }
                          )}
                        </tbody>
                      </table>
                    </div>

                    {filteredOrders.length >
                      reportsPerPage && (
                      <div className="flex flex-wrap justify-center gap-2 border-t border-slate-200 px-6 py-5">
                        <button
                          type="button"
                          onClick={() =>
                            setCurrentPage((page) =>
                              Math.max(1, page - 1)
                            )
                          }
                          disabled={currentPage === 1}
                          className="rounded-xl border border-orange-200 bg-white px-5 py-3 font-semibold text-orange-500 transition hover:bg-orange-50 disabled:opacity-40"
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
                              className={`h-12 w-12 rounded-xl font-bold transition ${
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
                          className="rounded-xl border border-orange-200 bg-white px-5 py-3 font-semibold text-orange-500 transition hover:bg-orange-50 disabled:opacity-40"
                        >
                          &rarr;
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="rounded-lg bg-white shadow-sm">
                <div className="border-b border-slate-200 px-6 py-5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                      <BarChart3 className="h-6 w-6" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-orange-600">
                        Produk Terlaris
                      </h2>
                      <p className="text-sm text-slate-900">
                        Berdasarkan jumlah item terjual
                      </p>
                    </div>
                  </div>
                </div>

                {visibleProductSummaries.length ===
                0 ? (
                  <div className="p-6 text-center">
                    <Trophy className="mx-auto h-10 w-10 text-orange-500" />
                    <p className="mt-3 font-semibold">
                      Belum ada data produk
                    </p>
                  </div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {visibleProductSummaries.map(
                      (product, index) => (
                        <div
                          key={product.name}
                          className="px-6 py-4"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-slate-950">
                                #{index + 1}{' '}
                                {product.name}
                              </p>
                              <p className="mt-1 text-sm text-slate-900">
                                {
                                  product.orderCount
                                }{' '}
                                Pesanan
                              </p>
                            </div>

                            <div className="text-right">
                              <p className="font-bold text-orange-600">
                                {product.quantity.toLocaleString(
                                  'id-ID'
                                )}
                              </p>
                              <p className="text-sm text-slate-900">
                                item
                              </p>
                            </div>
                          </div>

                          <p className="mt-3 text-sm font-semibold text-slate-900">
                            {formatCurrency(
                              product.revenue
                            )}
                          </p>
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
