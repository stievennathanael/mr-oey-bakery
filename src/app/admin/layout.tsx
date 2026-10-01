'use client'

import AdminSidebar from '@/components/admin/sidebar'
import AdminNavbar from '@/components/admin/navbar'
import {
  usePathname,
  useRouter,
} from 'next/navigation'
import {
  type ReactNode,
  useEffect,
  useState,
} from 'react'

type AdminUser = {
  role?: string
}

function hasAdminSession() {
  const token =
    localStorage.getItem('admin_token')
  const savedUser =
    localStorage.getItem('admin_user')

  if (!token || !savedUser) {
    return false
  }

  try {
    const user = JSON.parse(
      savedUser
    ) as AdminUser

    return user.role === 'admin'
  } catch {
    localStorage.removeItem(
      'admin_user'
    )
    localStorage.removeItem(
      'admin_token'
    )

    return false
  }
}

export default function AdminLayout({
  children,
}: {
  children: ReactNode
}) {
  const router = useRouter()
  const pathname = usePathname()

  const [isChecking, setIsChecking] =
    useState(true)
  const [
    isAuthorized,
    setIsAuthorized,
  ] = useState(false)
  const [
    isSidebarOpen,
    setIsSidebarOpen,
  ] = useState(false)

  useEffect(() => {
    const checkAdmin = () => {
      const authorized =
        hasAdminSession()

      setIsAuthorized(authorized)
      setIsChecking(false)

      if (!authorized) {
        router.replace('/auth/login')
      }
    }

    checkAdmin()

    window.addEventListener(
      'admin-auth-changed',
      checkAdmin
    )

    window.addEventListener(
      'storage',
      checkAdmin
    )

    return () => {
      window.removeEventListener(
        'admin-auth-changed',
        checkAdmin
      )
      window.removeEventListener(
        'storage',
        checkAdmin
      )
    }
  }, [router])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  if (isChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-100 text-gray-900">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-orange-200 border-t-orange-500" />
      </div>
    )
  }

  if (!isAuthorized) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-100 lg:flex">

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Tutup menu admin"
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      <AdminSidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
      />

      <div
        className="
          flex
          min-h-screen
          min-w-0
          flex-1
          flex-col
          lg:ml-64
          lg:h-screen
        "
      >
        <AdminNavbar
          onMenuClick={() =>
            setIsSidebarOpen(true)
          }
        />

        <main
          id="admin-main-content"
          className="flex-1 overflow-y-auto"
        >
          {children}
        </main>
      </div>

    </div>
  )
}
