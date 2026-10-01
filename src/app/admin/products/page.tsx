'use client'

import {
  type FormEvent,
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  AlertCircle,
  ImageIcon,
  Loader2,
  Package,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

type Product = {
  id: number
  category_id: number | null
  category_name: string | null
  product_name: string
  product_description: string | null
  product_price: number
  image_url: string | null
}

type Category = {
  id: number
  name: string
}

const productsPerPage = 10

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

export default function ProductsPage() {
  const [products, setProducts] =
    useState<Product[]>([])
  const [categories, setCategories] =
    useState<Category[]>([])
  const [editingId, setEditingId] =
    useState<number | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] =
    useState('')
  const [price, setPrice] = useState('')
  const [categoryId, setCategoryId] =
    useState('')
  const [image, setImage] =
    useState<File | null>(null)
  const [showModal, setShowModal] =
    useState(false)
  const [loading, setLoading] =
    useState(true)
  const [submitting, setSubmitting] =
    useState(false)
  const [deletingId, setDeletingId] =
    useState<number | null>(null)
  const [showDeleteModal, setShowDeleteModal] =
    useState(false)
  const [selectedProduct, setSelectedProduct] =
    useState<Product | null>(null)
  const [error, setError] = useState('')
  const [currentPage, setCurrentPage] =
    useState(1)

  async function fetchProducts() {
    const response = await fetch(
      '/api/products',
      { cache: 'no-store' }
    )
    const data = await readJson<Product[]>(
      response,
      'Gagal memuat products'
    )

    setProducts(Array.isArray(data) ? data : [])
  }

  async function fetchCategories() {
    const response = await fetch(
      '/api/categories',
      { cache: 'no-store' }
    )
    const data = await readJson<Category[]>(
      response,
      'Gagal memuat categories'
    )

    setCategories(
      Array.isArray(data) ? data : []
    )
  }

  async function fetchData(showLoading = true) {
    try {
      if (showLoading) {
        setLoading(true)
      }
      setError('')

      await Promise.all([
        fetchProducts(),
        fetchCategories(),
      ])
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat data products'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchData()
  }, [])

  useAutoRefresh(() => fetchData(false))

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

  const totalPages = Math.max(
    1,
    Math.ceil(
      products.length / productsPerPage
    )
  )

  const currentProducts = useMemo(() => {
    const indexOfLastProduct =
      currentPage * productsPerPage
    const indexOfFirstProduct =
      indexOfLastProduct - productsPerPage

    return products.slice(
      indexOfFirstProduct,
      indexOfLastProduct
    )
  }, [currentPage, products])

  function resetForm() {
    setEditingId(null)
    setName('')
    setDescription('')
    setPrice('')
    setCategoryId('')
    setImage(null)
    setShowModal(false)
  }

  function openCreateModal() {
    resetForm()
    setShowModal(true)
  }

  function handleEdit(product: Product) {
    setEditingId(product.id)
    setName(product.product_name)
    setDescription(
      product.product_description || ''
    )
    setPrice(
      String(product.product_price)
    )
    setCategoryId(
      product.category_id
        ? String(product.category_id)
        : ''
    )
    setImage(null)
    setShowModal(true)
  }

  function openDeleteModal(
    product: Product
  ) {
    setSelectedProduct(product)
    setShowDeleteModal(true)
  }

  function closeDeleteModal() {
    setSelectedProduct(null)
    setShowDeleteModal(false)
  }

  async function handleSubmit(
    event: FormEvent
  ) {
    event.preventDefault()

    const token = getAdminToken()

    if (!token) {
      setError(
        'Session admin tidak ditemukan.'
      )
      return
    }

    const formData = new FormData()

    formData.append('product_name', name)
    formData.append(
      'product_description',
      description
    )
    formData.append('product_price', price)
    formData.append('category_id', categoryId)

    if (image) {
      formData.append('image', image)
    }

    try {
      setSubmitting(true)
      setError('')

      const response = await fetch(
        editingId
          ? `/api/products/${editingId}`
          : '/api/products',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          body: formData,
        }
      )

      await readJson(
        response,
        editingId
          ? 'Gagal mengubah product'
          : 'Gagal menambah product'
      )

      resetForm()
      await fetchProducts()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan product'
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!selectedProduct) return

    const token = getAdminToken()

    if (!token) {
      setError(
        'Session admin tidak ditemukan.'
      )
      return
    }

    try {
      setDeletingId(selectedProduct.id)
      setError('')

      const response = await fetch(
        `/api/products/${selectedProduct.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      await readJson(
        response,
        'Gagal menghapus product'
      )

      closeDeleteModal()
      await fetchProducts()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus product'
      )
    } finally {
      setDeletingId(null)
    }
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
              Manajemen Produk
            </h1>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Tambah Produk
          </button>
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
        ) : products.length === 0 ? (
          <div className="rounded-lg bg-white p-10 text-center shadow-sm">
            <Package className="mx-auto h-12 w-12 text-orange-500" />
            <h2 className="mt-4 text-2xl font-bold">
              Tidak ditemukan produk
            </h2>
          </div>
        ) : (
          <div className="rounded-lg bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-orange-600">
                  Daftar Produk
                </h2>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
                {products.length.toLocaleString(
                  'id-ID'
                )}{' '}
                Produk
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
              <table className="w-full min-w-[1100px]">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="px-4 py-3">
                      Gambar
                    </th>
                    <th className="px-4 py-3">
                      Produk
                    </th>
                    <th className="px-4 py-3">
                      Deskripsi
                    </th>
                    <th className="px-4 py-3">
                      Kategori
                    </th>
                    <th className="px-4 py-3">
                      Harga
                    </th>
                    <th className="px-4 py-3">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentProducts.map((product) => (
                    <tr
                      key={product.id}
                      className="border-b border-slate-200 align-middle hover:bg-slate-50"
                    >
                      <td className="px-4 py-4">
                        {product.image_url ? (
                          <img
                            src={product.image_url}
                            alt={product.product_name}
                            className="h-24 w-24 rounded-lg border border-slate-200 object-cover"
                          />
                        ) : (
                          <div className="flex h-20 w-20 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-400">
                            <ImageIcon className="h-7 w-7" />
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-slate-950 font-semibold text-center">
                          {product.product_name}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="max-w-md leading-relaxed text-slate-950 justify-self-center text-justify">
                          {product.product_description ||
                            '-'}
                        </p>
                      </td>
                      <td className="px-4 py-4 text-center">
                        <span className="inline-flex rounded-full border font-semibold text-xs border-orange-200 bg-orange-50 px-3 py-1 text-orange-700">
                          {product.category_name ||
                            '-'}
                        </span>
                      </td>
                      <td className="px-4 py-4 font-semibold text-center">
                        {formatCurrency(
                          product.product_price
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            type="button"
                            title="Edit product"
                            aria-label={`Edit ${product.product_name}`}
                            onClick={() =>
                              handleEdit(product)
                            }
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 transition hover:bg-sky-100"
                          >
                            <Pencil className="h-4 w-4" />
                          </button>

                          <button
                            type="button"
                            title="Delete product"
                            aria-label={`Delete ${product.product_name}`}
                            onClick={() =>
                              openDeleteModal(
                                product
                              )
                            }
                            disabled={
                              deletingId ===
                              product.id
                            }
                            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                          >
                            {deletingId ===
                            product.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {products.length > productsPerPage && (
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

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-6">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-orange-600">
                    Produk
                  </p>
                  <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">
                    {editingId
                      ? 'Edit Produk'
                      : 'Tambah Produk'}
                  </h2>
                </div>

                <button
                  type="button"
                  title="Close"
                  aria-label="Close modal"
                  onClick={resetForm}
                  className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-red-500 hover:text-red-600 transition hover:bg-slate-50"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="grid gap-4 md:grid-cols-2">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Nama Produk
                    </span>
                    <input
                      type="text"
                      value={name}
                      onChange={(event) =>
                        setName(
                          event.target.value
                        )
                      }
                      className="h-14 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Kategori
                    </span>
                    <select
                      value={categoryId}
                      onChange={(event) =>
                        setCategoryId(
                          event.target.value
                        )
                      }
                      className="h-14 w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      required
                    >
                      <option value="">
                        Pilih Kategori
                      </option>
                      {categories.map(
                        (category) => (
                          <option
                            key={category.id}
                            value={category.id}
                          >
                            {category.name}
                          </option>
                        )
                      )}
                    </select>
                  </label>

                  <label className="block md:col-span-2">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Deskripsi
                    </span>
                    <textarea
                      rows={4}
                      value={description}
                      onChange={(event) =>
                        setDescription(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Harga
                    </span>
                    <input
                      type="number"
                      value={price}
                      onChange={(event) =>
                        setPrice(
                          event.target.value
                        )
                      }
                      className="h-14 w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Gambar
                    </span>

                    <label className="flex h-14 min-w-0 cursor-pointer items-center rounded-lg border border-slate-300 bg-white px-3 hover:border-orange-500">
                      <span className="shrink-0 rounded-md bg-orange-50 px-4 py-2 font-semibold text-orange-700">
                        Pilih File
                      </span>

                      <span className="ml-3 min-w-0 truncate text-slate-500">
                        {image ? image.name : "Belum ada file dipilih"}
                      </span>

                      <input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImage(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  </label>
                </div>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                  <button
                    type="submit"
                    disabled={submitting}
                    className="inline-flex items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-60"
                  >
                    {submitting ? (
                      <Loader2 className="h-5 w-5 animate-spin" />
                    ) : (
                      <Save className="h-5 w-5" />
                    )}
                    {editingId
                      ? 'Perbarui Produk'
                      : 'Tambah Produk'}
                  </button>

                  <button
                    type="button"
                    onClick={resetForm}
                    className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-5 py-3 font-semibold text-slate-700 transition hover:bg-slate-50"
                  >
                    Batal
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {showDeleteModal && selectedProduct && (
          <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">

            <div className="relative w-full max-w-md rounded-2xl bg-white p-7 shadow-2xl">

              {/* Close */}

              <button
                type="button"
                onClick={closeDeleteModal}
                disabled={deletingId !== null}
                className="absolute right-5 top-5 flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
              >
                <X className="h-5 w-5" />
              </button>

              {/* Icon */}

              <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-red-100">

                <Trash2 className="h-10 w-10 text-red-600" />

              </div>

              {/* Title */}

              <h2 className="mt-6 text-center text-2xl font-bold text-slate-900">
                Hapus Produk
              </h2>

              {/* Message */}

              <p className="mt-3 text-center leading-7 text-slate-600">
                Apakah anda yakin ingin menghapus produk ini?
              </p>

              <p className="mt-2 text-center text-lg font-semibold text-slate-900">
                {selectedProduct?.product_name}
              </p>

              {/* Button */}

              <div className="mt-8 flex gap-3">

                <button
                  type="button"
                  onClick={handleDelete}
                  disabled={deletingId !== null}
                  className="flex-1 rounded-lg bg-red-500 py-3 font-semibold text-white transition hover:bg-red-600 disabled:opacity-60"
                >
                  {deletingId !== null ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Menghapus...
                    </span>
                  ) : (
                    'Hapus'
                  )}
                </button>

                <button
                  type="button"
                  onClick={closeDeleteModal}
                  disabled={deletingId !== null}
                  className="flex-1 rounded-lg border border-slate-300 py-3 font-semibold text-slate-700 transition hover:bg-slate-100 disabled:opacity-60"
                >
                  Batal
                </button>

              </div>

            </div>

          </div>
        )}
      </div>
    </div>
  )
}
