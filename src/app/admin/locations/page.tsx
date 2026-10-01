'use client'

import {
  type FormEvent,
  useEffect,
  useState,
} from 'react'
import {
  AlertCircle,
  ExternalLink,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  Save,
  Trash2,
  X,
} from 'lucide-react'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

type Location = {
  id: number
  name: string
  address: string
  map_url: string
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

export default function LocationsPage() {
  const [locations, setLocations] =
    useState<Location[]>([])
  const [editingId, setEditingId] =
    useState<number | null>(null)
  const [showModal, setShowModal] =
    useState(false)
  const [name, setName] = useState('')
  const [address, setAddress] =
    useState('')
  const [mapUrl, setMapUrl] =
    useState('')
  const [loading, setLoading] =
    useState(true)
  const [submitting, setSubmitting] =
    useState(false)
  const [deletingId, setDeletingId] =
    useState<number | null>(null)
  const [deleteModalOpen, setDeleteModalOpen] =
    useState(false)
  const [selectedDeleteId, setSelectedDeleteId] =
    useState<number | null>(null)
  const [error, setError] = useState('')

  async function fetchLocations(
    showLoading = true
  ) {
    try {
      if (showLoading) {
        setLoading(true)
      }
      setError('')

      const response = await fetch(
        '/api/locations',
        { cache: 'no-store' }
      )
      const data = await readJson<Location[]>(
        response,
        'Gagal memuat locations'
      )

      setLocations(
        Array.isArray(data) ? data : []
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat locations'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchLocations()
  }, [])

  useAutoRefresh(() =>
    fetchLocations(false)
  )

  function resetForm() {
    setEditingId(null)
    setName('')
    setAddress('')
    setMapUrl('')
    setShowModal(false)
  }

  function openCreateModal() {
    resetForm()
    setShowModal(true)
  }

  function handleEdit(
    location: Location
  ) {
    setEditingId(location.id)
    setName(location.name)
    setAddress(location.address)
    setMapUrl(location.map_url)
    setShowModal(true)
  }

  function openDeleteModal(id: number) {
    setSelectedDeleteId(id)
    setDeleteModalOpen(true)
  }

  function closeDeleteModal() {
    setDeleteModalOpen(false)
    setSelectedDeleteId(null)
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

    const payload = {
      name,
      address,
      map_url: mapUrl,
    }

    try {
      setSubmitting(true)
      setError('')

      const response = await fetch(
        editingId
          ? `/api/locations/${editingId}`
          : '/api/locations',
        {
          method: editingId ? 'PUT' : 'POST',
          headers: {
            'Content-Type':
              'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(payload),
        }
      )

      await readJson(
        response,
        editingId
          ? 'Gagal mengubah location'
          : 'Gagal menambah location'
      )

      resetForm()
      await fetchLocations()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menyimpan location'
      )
    } finally {
      setSubmitting(false)
    }
  }

  async function handleDelete() {
    if (!selectedDeleteId) return

    const token = getAdminToken()

    if (!token) {
      setError(
        'Session admin tidak ditemukan.'
      )
      return
    }

    try {
      setDeletingId(selectedDeleteId)
      setError('')

      const response = await fetch(
        `/api/locations/${selectedDeleteId}`,
        {
          method: 'DELETE',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      )

      await readJson(
        response,
        'Gagal menghapus lokasi'
      )

      closeDeleteModal()
      await fetchLocations()
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal menghapus lokasi'
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
              Manajemen Lokasi
            </h1>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="inline-flex w-full items-center justify-center gap-2 rounded-lg bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600 sm:w-auto"
          >
            <Plus className="h-5 w-5" />
            Tambah Lokasi
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
        ) : locations.length === 0 ? (
          <div className="rounded-lg bg-white p-10 text-center shadow-sm">
            <MapPin className="mx-auto h-12 w-12 text-orange-500" />
            <h2 className="mt-4 text-2xl font-bold">
              Tidak ditemukan lokasi
            </h2>
          </div>
        ) : (
          <div className="rounded-lg bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-orange-600">
                  Daftar Lokasi
                </h2>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
                {locations.length.toLocaleString(
                  'id-ID'
                )}{' '}
                Lokasi
              </div>
            </div>

            <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
              <table className="w-full min-w-[950px]">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="px-4 py-3">
                      Lokasi
                    </th>
                    <th className="px-4 py-3">
                      Alamat
                    </th>
                    <th className="px-4 py-3">
                      Aksi
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {locations.map(
                    (location) => (
                      <tr
                        key={location.id}
                        className="border-b border-slate-200 text-center align-middle hover:bg-slate-50"
                      >
                        <td className="px-4 py-4">
                          <p className="text-slate-950 font-semibold">
                            {location.name}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <p className="mx-auto leading-relaxed text-slate-950">
                            {location.address}
                          </p>
                        </td>
                        <td className="px-4 py-4">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              title="Edit location"
                              aria-label={`Edit ${location.name}`}
                              onClick={() =>
                                handleEdit(
                                  location
                                )
                              }
                              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-sky-200 bg-sky-50 text-sky-700 transition hover:bg-sky-100"
                            >
                              <Pencil className="h-4 w-4" />
                            </button>

                            <button
                              type="button"
                              title="Delete location"
                              aria-label={`Delete ${location.name}`}
                              onClick={() =>
                                openDeleteModal(
                                  location.id
                                )
                              }
                              disabled={
                                deletingId ===
                                location.id
                              }
                              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-red-200 bg-red-50 text-red-700 transition hover:bg-red-100 disabled:opacity-60"
                            >
                              {deletingId ===
                              location.id ? (
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
            <div className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-lg bg-white p-4 shadow-xl sm:p-6">
              <div className="mb-6 flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-semibold uppercase text-orange-600">
                    Lokasi
                  </p>
                  <h2 className="text-xl font-bold text-slate-950 sm:text-2xl">
                    {editingId
                      ? 'Edit Lokasi'
                      : 'Tambah Lokasi'}
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
                <div className="grid gap-4">
                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Nama Lokasi
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

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      Alamat
                    </span>
                    <textarea
                      rows={4}
                      value={address}
                      onChange={(event) =>
                        setAddress(
                          event.target.value
                        )
                      }
                      className="w-full rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      required
                    />
                  </label>

                  <label className="block">
                    <span className="mb-2 block text-sm font-semibold text-slate-700">
                      URL Google Maps
                    </span>
                    <input
                      type="url"
                      value={mapUrl}
                      onChange={(event) =>
                        setMapUrl(
                          event.target.value
                        )
                      }
                      className="w-full h-14 rounded-lg border border-slate-300 px-3 py-3 text-slate-900 outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-200"
                      required
                    />
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
                      ? 'Perbarui Lokasi'
                      : 'Tambah Lokasi'}
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

        {deleteModalOpen && selectedDeleteId && (
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
                Hapus Lokasi
              </h2>

              {/* Message */}

              <p className="mt-3 text-center leading-7 text-slate-600">
                Apakah anda yakin ingin menghapus lokasi ini?
              </p>

              <p className="mt-2 text-center text-lg font-semibold text-slate-900">
                {
                  locations.find(
                    (location) =>
                      location.id === selectedDeleteId
                  )?.name
                }
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
