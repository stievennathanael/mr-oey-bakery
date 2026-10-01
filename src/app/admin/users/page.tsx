'use client'

import {
  useEffect,
  useMemo,
  useState,
} from 'react'
import {
  Loader2,
  Users,
} from 'lucide-react'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

type AdminUser = {
  id: number
  name: string
  email: string
  phone: string | null
}

const usersPerPage = 10

function getAdminToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return (
    localStorage.getItem('admin_token') ||
    localStorage.getItem('token')
  )
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

export default function AdminUsersPage() {
  const [users, setUsers] =
    useState<AdminUser[]>([])
  const [loading, setLoading] =
    useState(true)
  const [error, setError] =
    useState('')
  const [currentPage, setCurrentPage] =
    useState(1)

  const totalPages = Math.max(
    1,
    Math.ceil(
      users.length / usersPerPage
    )
  )

  const currentUsers = useMemo(() => {
    const indexOfLastUser =
      currentPage * usersPerPage
    const indexOfFirstUser =
      indexOfLastUser - usersPerPage

    return users.slice(
      indexOfFirstUser,
      indexOfLastUser
    )
  }, [currentPage, users])

  async function fetchUsers() {
    try {
      const response = await fetch('/api/customers', {
        cache: 'no-store',
        headers: {
          Authorization: `Bearer ${getAdminToken()}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(
          getErrorMessage(
            data,
            'Gagal memuat users'
          )
        )
      }

      setUsers(data)
      setError('')
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Gagal memuat users'
      )
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchUsers()
  }, [])

  useAutoRefresh(fetchUsers)

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

  return (
    <div className="min-h-screen bg-gray-100 p-4 text-slate-900 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-7xl">
        <div className="mb-8">
          <p className="text-sm font-semibold uppercase text-orange-600">
            Admin
          </p>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Manajemen Pelanggan
          </h1>
        </div>

        {error && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex min-h-[360px] items-center justify-center rounded-lg bg-white shadow-sm">
            <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
          </div>
        ) : users.length === 0 ? (
          <div className="rounded-lg bg-white p-10 text-center shadow-sm">
            <Users className="mx-auto h-12 w-12 text-orange-500" />
            <h2 className="mt-4 text-2xl font-bold">
              Tidak ditemukan pengguna
            </h2>
          </div>
        ) : (
          <div className="rounded-lg bg-white shadow-sm">
            <div className="flex flex-col gap-2 border-b border-slate-200 px-6 py-5 md:flex-row md:items-center md:justify-between">
              <div>
                <h2 className="text-xl font-bold text-orange-600">
                  Daftar Pelanggan
                </h2>
              </div>

              <div className="rounded-full bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-900">
                {users.length.toLocaleString(
                  'id-ID'
                )}{' '}
                Pelanggan
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg bg-white shadow-sm">
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-950 text-white">
                  <tr>
                    <th className="px-4 py-3">
                      Nama
                    </th>
                    <th className="px-4 py-3">
                      Email
                    </th>
                    <th className="px-4 py-3">
                      Telepon
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.map((user) => (
                    <tr
                      key={user.id}
                      className="border-b border-slate-200 hover:bg-slate-50 text-center"
                    >
                      <td className="px-4 py-4 text-slate-900">
                        {user.name}
                      </td>
                      <td className="px-4 py-4 text-slate-900">
                        {user.email}
                      </td>
                      <td className="px-4 py-4 text-slate-900">
                        {user.phone || '-'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {users.length > usersPerPage && (
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
