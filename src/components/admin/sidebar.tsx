'use client'

import Link from 'next/link'
import Image from 'next/image'
import {
  usePathname,
  useRouter,
} from 'next/navigation'
import {
  useEffect,
  useState,
} from 'react'

import {
  LayoutDashboard,
  Package,
  FolderTree,
  MapPin,
  ShoppingCart,
  CreditCard,
  BarChart3,
  Users,
  LogOut,
  LogIn,
  X,
} from 'lucide-react'

const menus = [
  {
    name: 'Dashboard',
    href: '/admin/dashboard',
    icon: LayoutDashboard,
  },
  {
    name: 'Produk',
    href: '/admin/products',
    icon: Package,
  },
  {
    name: 'Kategori',
    href: '/admin/categories',
    icon: FolderTree,
  },
  {
    name: 'Lokasi',
    href: '/admin/locations',
    icon: MapPin,
  },
  {
    name: 'Pesanan',
    href: '/admin/orders',
    icon: ShoppingCart,
  },
  {
    name: 'Pembayaran',
    href: '/admin/payments',
    icon: CreditCard,
  },
  {
    name: 'Laporan',
    href: '/admin/reports',
    icon: BarChart3,
  },
  {
    name: 'Pelanggan',
    href: '/admin/users',
    icon: Users,
  },
]

type User = {
  id: number
  name: string
  email: string
  role: string
}

type AdminSidebarProps = {
  isOpen: boolean
  onClose: () => void
}

type OrderNotificationCountResponse = {
  count?: number
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

export default function AdminSidebar({
  isOpen,
  onClose,
}: AdminSidebarProps) {
  const pathname = usePathname()
  const router = useRouter()

  const [user, setUser] =
    useState<User | null>(null)

  const [hasToken, setHasToken] =
    useState(false)
  const [
    orderNotificationCount,
    setOrderNotificationCount,
  ] = useState(0)

  useEffect(() => {
    const savedUser =
    localStorage.getItem(
        'admin_user'
    )

    const savedToken =
    localStorage.getItem(
        'admin_token'
    )

    if (savedUser) {
      try {
        setUser(
          JSON.parse(savedUser)
        )
      } catch {
        localStorage.removeItem(
          'user'
        )
      }
    }

    setHasToken(Boolean(savedToken))
  }, [])

  const isLoggedIn =
    Boolean(user) || hasToken

  const isAdmin =
    user?.role === 'admin'

  useEffect(() => {
    if (!isLoggedIn || !isAdmin) {
      setOrderNotificationCount(0)
      return
    }

    const fetchOrderNotificationCount =
      async () => {
        const token = getAdminToken()

        if (!token) {
          setOrderNotificationCount(0)
          return
        }

        try {
          const response = await fetch(
            '/api/orders/notification-count',
            {
              cache: 'no-store',
              headers: {
                Authorization: `Bearer ${token}`,
              },
            }
          )

          if (!response.ok) {
            setOrderNotificationCount(0)
            return
          }

          const data =
            (await response.json()) as OrderNotificationCountResponse
          const count = Number(data.count || 0)

          setOrderNotificationCount(
            Number.isFinite(count)
              ? Math.max(0, count)
              : 0
          )
        } catch {
          setOrderNotificationCount(0)
        }
      }

    void fetchOrderNotificationCount()

    const intervalId = window.setInterval(
      () => {
        void fetchOrderNotificationCount()
      },
      15000
    )

    window.addEventListener(
      'focus',
      fetchOrderNotificationCount
    )
    window.addEventListener(
      'admin-orders-changed',
      fetchOrderNotificationCount
    )

    return () => {
      window.clearInterval(intervalId)
      window.removeEventListener(
        'focus',
        fetchOrderNotificationCount
      )
      window.removeEventListener(
        'admin-orders-changed',
        fetchOrderNotificationCount
      )
    }
  }, [isLoggedIn, isAdmin])

  function handleLogout() {
    localStorage.removeItem(
      'admin_user'
    )

    localStorage.removeItem(
      'admin_token'
    )

    window.dispatchEvent(
      new Event(
        'admin-auth-changed'
      )
    )

    setUser(null)
    setHasToken(false)

    router.push('/auth/login')
    onClose()
  }

  return (
    <aside
      className={`
        fixed
        left-0
        top-0
        z-50
        flex
        h-screen
        w-72
        max-w-[calc(100vw-2rem)]
        flex-col
        border-r
        bg-white
        shadow-sm
        transition-transform
        duration-300
        lg:w-64
        lg:translate-x-0

        ${isOpen ? 'translate-x-0' : '-translate-x-full'}
      `}
    >
      {/* LOGO */}
      <div className="flex items-center justify-between gap-4 p-4 sm:p-6">
        <div className="flex items-center gap-4">
          <Image
            src="/logo.png"
            alt="Mr Oey Logo"
            width={60}
            height={60}
            className="rounded-xl"
          />

          <div>
            <h1 className="text-2xl font-bold text-orange-500">
              Mr. Oey
            </h1>

            <p className="text-sm text-gray-900">
              Bakery Admin
            </p>
          </div>
        </div>

        <button
          type="button"
          aria-label="Tutup menu admin"
          onClick={onClose}
          className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50 lg:hidden"
        >
          <X className="h-5 w-5" />
        </button>
      </div>

      {/* MENU */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6">
        <ul className="space-y-2">
          {menus.map((menu) => {
            const Icon =
              menu.icon

            const active =
              pathname ===
              menu.href
            const isOrdersMenu =
              menu.href ===
              '/admin/orders'

            return (
              <li key={menu.href}>
                <Link
                  href={menu.href}
                  onClick={onClose}
                  className={`
                    flex
                    w-full
                    items-center
                    justify-between
                    gap-3
                    rounded-lg
                    px-4
                    py-3
                    transition-all

                    ${
                      active
                        ? 'bg-orange-500 text-white shadow-md'
                        : 'text-gray-900 hover:bg-orange-100'
                    }
                  `}
                >
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon
                      size={20}
                      className="shrink-0"
                    />

                    <span className="truncate">
                      {menu.name}
                    </span>
                  </div>

                  {isOrdersMenu && (
                    <span
                      aria-label={`${orderNotificationCount} pesanan paid belum completed`}
                      className={`
                        inline-flex
                        min-h-6
                        min-w-7
                        shrink-0
                        items-center
                        justify-center
                        rounded-full
                        px-2
                        text-xs
                        font-bold
                        leading-none
                        shadow-sm
                        ring-1
                        ring-white/60
                        ${
                          active
                            ? 'bg-white text-red-500'
                            : 'bg-red-500 text-white'
                        }
                      `}
                    >
                      {orderNotificationCount.toLocaleString(
                        'id-ID'
                      )}
                    </span>
                  )}
                </Link>
              </li>
            )
          })}
        </ul>
      </div>

      {/* LOGIN / LOGOUT */}
      <div className="border-t p-4 sm:p-6">
        {isLoggedIn &&
        isAdmin ? (
          <button
            onClick={
              handleLogout
            }
            className="
              flex
              w-full
              items-center
              justify-center
              gap-3
              rounded-lg
              bg-red-500
              px-4
              py-3
              font-medium
              text-white
              transition-all
              hover:bg-red-600
              hover:shadow-lg
            "
          >
            <LogOut size={20} />
            Logout
          </button>
        ) : (
          <Link
            href="/auth/login"
            className="
              flex
              w-full
              items-center
              justify-center
              gap-3
              rounded-xl
              bg-orange-500
              px-4
              py-3
              font-medium
              text-white
              transition-all
              hover:bg-orange-600
              hover:shadow-lg
            "
          >
            <LogIn size={20} />
            Login
          </Link>
        )}
      </div>
    </aside>
  )
}
