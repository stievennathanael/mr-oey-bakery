'use client'

import {
  type FormEvent,
  useEffect,
  useState,
} from 'react'
import {
  AlertCircle,
  FolderTree,
  Loader2,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

type Category = {
  id: number
  name: string
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

export default function CategoriesPage() {
  const [categories, setCategories] =
    useState<Category[]>([])
  const [name, setName] = useState('')
  const [editingId, setEditingId] =
    useState<number | null>(null)
  const [showModal, setShowModal] =
    useState(false)
  const [loading, setLoading] =
    useState(true)
  const [submitting, setSubmitting] =
    useState(false)
  const [deletingId, setDeletingId] =
    useState<number | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] =
    useState(false)
  const [selectedDelete, setSelectedDelete] =
    useState<Category | null>(null)
  const [error, setError] = useState('')

  async function fetchCategories(
    showLoading = true
  ) {
    try {
      if (showLoading) {
        setLoading(true)
      }
      setError('')

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
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat categories'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchCategories()
  }, [])

  useAutoRefresh(() =>
    fetchCategories(false)
  )

  function resetForm() {
    setEditingId(null)
    setName('')
    setShowModal(false)
  }

  function openCreateModal() {
    resetForm()
    setShowModal(true)
  }

  function handleEdit(
    category: Category
  ) {
    setEditingId(category.id)
    setName(category.name)
    setShowModal(true)
  }

  function openDeleteModal(
    category: Category
  ) {
    setSelectedDelete(category)
    setDeleteModalOpen(true)
  }

  function closeDeleteModal() {
    if (deletingId) return

    setDeleteModalOpen(false)
    setSelectedDelete(null)
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

    try {
      setSubmitting(true)
      setError('')

      const response = await fetch(
        editingId
          ? `/api/categories/${editingId}`
          : '/api/categories',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: {
            'Content-Type':
              'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            name,
          }),
        }
      )

      await readJson(
        response,
        editingId
          ? 'Gagal mengubah category'
          : 'Gagal menambah category'
      )

      resetForm()
      await fetchCategories()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan category'
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!selectedDelete) return

    const token = getAdminToken()

    if (!token) {
      setError(
        'Session admin tidak ditemukan.'
      )
      return
    }

    try {
      setDeletingId(selectedDelete.id)
      setError('')

      const response = await fetch(
        `/api/categories/${selectedDelete.id}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      await readJson(
        response,
        'Gagal menghapus category'
      )

      closeDeleteModal()

      await fetchCategories()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus category'
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
              Manajemen Kategori
            </h1>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Tambah Kategori
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
        ) : categories.length === 0 ? (
          <div className="rounded-lg bg-white p-10 text-center shadow-sm">
            <FolderTree className="mx-auto h-12 w-12 text-orange-500" />
            <h2 className="mt-4 text-2xl font-bold">
              Tidak ditemukan kategori
            </h2>
          </div>
        ) : (
          <div className="rounded-lg bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-orange-600">
                  Daftar Kategori
                </h2>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-600">
                {categories.length.toLocaleString(
                  'id-ID'
                )}{' '}
                Kategori
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="w-450 py-3">
                      Nama Kategori
                    </th>
                    <th className="w-450 py-3">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {categories.map(
                    (category) => (
                      <tr
                        key={category.id}
                        className="border-b border-slate-200 hover:bg-slate-50 text-center align-middle"
                      >
                        <td className="px-4 py-4">
                          <p className="text-slate-950 font-semibold">
                            {category.name}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              title="Edit category"
                              aria-label={`Edit ${category.name}`}
                              onClick={() =>
                                handleEdit(
                                  category
                                )
                              }
                              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 transition hover:bg-sky-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              title="Delete category"
                              aria-label={`Delete ${category.name}`}
                              onClick={() =>
                                openDeleteModal(category)
                              }
                              disabled={
                                deletingId ===
                                category.id
                              }
                              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                            >
                              {deletingId ===
                              category.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-lg bg-white p-4 shadow-xl sm:p-6">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-orange-600">
                    Kategori
                  </p>
                  <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">
                    {editingId
                      ? 'Edit Kategori'
                      : 'Tambah Kategori'}
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
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-slate-700">
                    Nama Kategori
                  </span>
                  <input
                    type="text"
                    value={name}
                    onChange={(event) =>
                      setName(
                        event.target.value
                      )
                    }
                    className="w-full h-14 rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                    required
                  />
                </label>

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
                      ? 'Perbarui Kategori'
                      : 'Tambah Kategori'}
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

        {deleteModalOpen && selectedDelete && (
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
                Hapus Kategori
              </h2>

              {/* Message */}

              <p className="mt-3 text-center leading-7 text-slate-600">
                Apakah anda yakin ingin menghapus kategori ini?
              </p>

              <p className="mt-2 text-center text-lg font-semibold text-slate-900">
                {selectedDelete.name}
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
