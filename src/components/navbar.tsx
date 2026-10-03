'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import Image from 'next/image'

import {
  Menu,
  ShoppingCart,
  ReceiptText,
  CircleUserRound,
  X,
} from 'lucide-react'
import {
  CART_UPDATED_EVENT,
  type CartUpdatedDetail,
} from '@/lib/cart-events'

type CartResponse = {
  message?: string
  items?: unknown[]
  summary?: {
    total_items?: number
  }
}

const menus = [
  {
    name: 'Beranda',
    href: '/home',
  },
  {
    name: 'Produk',
    href: '/menu',
  },
  {
    name: 'Lokasi',
    href: '/location',
  },
  {
    name: 'Tentang Kami',
    href: '/about',
  },
  {
    href: '/cart',
    name: 'Keranjang',
    icon: ShoppingCart,
    isIcon: true,
  },
  {
    href: '/order',
    name: 'Pesanan',
    icon: ReceiptText,
    isIcon: true,
  },
  {
    href: '/account',
    name: 'Akun',
    icon: CircleUserRound,
    isIcon: true,
  },
]

function getCustomerToken() {
  if (typeof window === 'undefined') {
    return null
  }

  return (
    localStorage.getItem('customer_token') ||
    localStorage.getItem('token')
  )
}

function getCartProductCount(data: CartResponse) {
  if (Array.isArray(data.items)) {
    return data.items.length
  }

  const count = Number(
    data.summary?.total_items || 0
  )

  return Number.isFinite(count)
    ? Math.max(0, count)
    : 0
}

function clearCustomerSession() {
  if (typeof window === 'undefined') {
    return
  }

  localStorage.removeItem('customer_token')
  localStorage.removeItem('customer_user')
  localStorage.removeItem('token')
}

async function readCartResponse(
  response: Response
) {
  try {
    return (await response.json()) as CartResponse
  } catch {
    return {} as CartResponse
  }
}

export const Navbar = () => {
  const [isScrolled, setIsScrolled] =
    useState(false)
  const [
    cartProductCount,
    setCartProductCount,
  ] = useState(0)
  const [
    isMenuOpen,
    setIsMenuOpen,
  ] = useState(false)

  const pathname = usePathname()

  const isAdminRoute =
    pathname.startsWith('/admin')
  const isAuthRoute =
    pathname === '/auth/login' ||
    pathname === '/auth/register'
  const isStaticCustomerPage =
    pathname === '/faqs' ||
    pathname === '/terms' ||
    pathname === '/privacy'
  const shouldHideNavbar =
    isAuthRoute || isAdminRoute
  const shouldAutoRefreshCartCount =
    !shouldHideNavbar &&
    !isStaticCustomerPage

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 50)
    }

    handleScroll()

    window.addEventListener(
      'scroll',
      handleScroll
    )

    return () =>
      window.removeEventListener(
        'scroll',
        handleScroll
      )
  }, [])

  useEffect(() => {
    setIsMenuOpen(false)
  }, [pathname])

  useEffect(() => {
    let cancelled = false

    async function fetchCartCount() {
      if (shouldHideNavbar) {
        setCartProductCount(0)
        return
      }

      const token = getCustomerToken()

      if (!token) {
        setCartProductCount(0)
        return
      }

      try {
        const response = await fetch('/api/cart', {
          cache: 'no-store',
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await readCartResponse(response)

        if (
          response.status === 401 ||
          response.status === 403
        ) {
          clearCustomerSession()

          if (!cancelled) {
            setCartProductCount(0)
          }

          return
        }

        if (!response.ok) {
          console.warn(
            data.message ||
              'Gagal memuat jumlah cart'
          )

          if (!cancelled) {
            setCartProductCount(0)
          }

          return
        }

        if (!cancelled) {
          setCartProductCount(
            getCartProductCount(data)
          )
        }
      } catch (error) {
        console.warn(
          'Gagal memuat jumlah cart',
          error
        )

        if (!cancelled) {
          setCartProductCount(0)
        }
      }
    }

    function handleCartUpdated(event: Event) {
      const detail = (
        event as CustomEvent<CartUpdatedDetail>
      ).detail
      const updatedProductCount =
        typeof detail?.cartProductCount ===
        'number'
          ? detail.cartProductCount
          : detail?.totalItems

      if (
        typeof updatedProductCount === 'number'
      ) {
        setCartProductCount(
          Math.max(0, updatedProductCount)
        )
        return
      }

      void fetchCartCount()
    }

    function handleRefreshCartCount() {
      void fetchCartCount()
    }

    void fetchCartCount()

    const intervalId =
      shouldAutoRefreshCartCount &&
      window.setInterval(
        () => {
          void fetchCartCount()
        },
        30000
      )

    window.addEventListener(
      CART_UPDATED_EVENT,
      handleCartUpdated
    )
    window.addEventListener(
      'focus',
      handleRefreshCartCount
    )
    window.addEventListener(
      'storage',
      handleRefreshCartCount
    )

    return () => {
      cancelled = true
      if (intervalId) {
        window.clearInterval(intervalId)
      }
      window.removeEventListener(
        CART_UPDATED_EVENT,
        handleCartUpdated
      )
      window.removeEventListener(
        'focus',
        handleRefreshCartCount
      )
      window.removeEventListener(
        'storage',
        handleRefreshCartCount
      )
    }
  }, [
    pathname,
    isStaticCustomerPage,
    shouldAutoRefreshCartCount,
    shouldHideNavbar,
  ])

  const isTransparentPage =
    pathname === '/' ||
    pathname === '/home' ||
    pathname === '/about' ||
    pathname === '/faqs' ||
    pathname === '/privacy' ||
    pathname === '/terms'

  if (shouldHideNavbar) {
    return null
  }

  const textColor = isScrolled
    ? 'text-orange-500'
    : isTransparentPage
    ? 'text-white'
    : 'text-orange-500'

  return (
    <nav
      className={`
        fixed
        top-0
        z-50
        flex
        w-full
        items-center
        px-4
        py-2
        transition-all
        duration-500
        sm:px-6
        sm:py-3
        lg:px-16

        ${
          isTransparentPage
            ? ''
            : 'border-b bg-white'
        }

        ${
          isScrolled
            ? 'bg-white/95 shadow-lg backdrop-blur-md'
            : ''
        }
      `}
    >
      {/* Logo */}
      <div className="flex flex-1">
        <Image
          src="/logo.png"
          alt="Logo"
          width={64}
          height={64}
          className="h-14 w-14 sm:h-[70px] sm:w-[70px]"
        />
      </div>

      {/* Menu */}
      <ul className="hidden items-center gap-8 lg:flex">
        {menus.map((item) => {
          const Icon = item.icon

          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`
                  group
                  relative
                  flex
                  items-center
                  justify-center
                  transition-all
                  duration-300
                  ${textColor}
                `}
              >
                {item.isIcon ? (
                  <>
                    <div
                      className={`
                        relative
                        rounded-full
                        p-2
                        transition-all
                        duration-300
                        hover:scale-110

                        ${
                          isTransparentPage &&
                          !isScrolled
                            ? 'hover:bg-orange-500'
                            : 'hover:bg-orange-100'
                        }
                      `}
                    >
                      {Icon && (
                        <Icon
                          size={26}
                          strokeWidth={2.2}
                          className={`
                            transition-all
                            duration-300

                            ${
                              isTransparentPage &&
                              !isScrolled
                                ? 'group-hover:text-white'
                                : 'group-hover:text-orange-500'
                            }
                          `}
                        />
                      )}

                      {item.href === '/cart' &&
                        cartProductCount > 0 && (
                          <span
                            aria-label={`${cartProductCount} produk di cart`}
                            className="
                              absolute
                              -right-1
                              -top-1
                              flex
                              min-h-5
                              min-w-5
                              items-center
                              justify-center
                              rounded-full
                              bg-orange-600
                              px-1.5
                              text-[11px]
                              font-bold
                              leading-none
                              text-white
                              shadow-sm
                              ring-2
                              ring-white
                            "
                          >
                            {cartProductCount > 99
                              ? '99+'
                              : cartProductCount}
                          </span>
                        )}
                    </div>

                    <span
                      className={`
                        absolute
                        -bottom-2
                        left-1/2
                        h-[2px]
                        -translate-x-1/2
                        bg-orange-500
                        transition-all
                        duration-300

                        ${
                          pathname === item.href
                            ? 'w-7'
                            : 'w-0'
                        }
                      `}
                    />
                  </>
                ) : (
                  <>
                    <span
                      className="
                        text-base
                        font-bold
                        transition-colors
                        duration-300
                        group-hover:text-orange-500
                        lg:text-xl
                      "
                    >
                      {item.name}
                    </span>

                    <span
                      className={`
                        absolute
                        -bottom-1
                        left-0
                        h-[2px]
                        bg-orange-500
                        transition-all
                        duration-300

                        ${
                          pathname === item.href
                            ? 'w-full'
                            : 'w-0 group-hover:w-full'
                        }
                      `}
                    />
                  </>
                )}
              </Link>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        aria-label={
          isMenuOpen
            ? 'Tutup menu navigasi'
            : 'Buka menu navigasi'
        }
        aria-expanded={isMenuOpen}
        onClick={() =>
          setIsMenuOpen((open) => !open)
        }
        className={`
          inline-flex
          h-11
          w-11
          items-center
          justify-center
          rounded-full
          transition
          lg:hidden

          ${
            isTransparentPage && !isScrolled
              ? 'bg-white/15 text-white backdrop-blur hover:bg-white/25'
              : 'bg-orange-50 text-orange-600 hover:bg-orange-100'
          }
        `}
      >
        {isMenuOpen ? (
          <X className="h-6 w-6" />
        ) : (
          <Menu className="h-6 w-6" />
        )}
      </button>

      {isMenuOpen && (
        <div className="absolute left-0 top-full w-full border-y border-orange-100 bg-white px-4 py-3 shadow-xl lg:hidden">
          <ul className="grid gap-1">
            {menus.map((item) => {
              const Icon = item.icon
              const active = pathname === item.href

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={`
                      flex
                      min-h-12
                      items-center
                      justify-between
                      rounded-xl
                      px-4
                      py-3
                      text-sm
                      font-bold
                      transition

                      ${
                        active
                          ? 'bg-orange-500 text-white'
                          : 'text-slate-900 hover:bg-orange-50 hover:text-orange-600'
                      }
                    `}
                  >
                    <span className="flex items-center gap-3">
                      {Icon && (
                        <Icon className="h-5 w-5" />
                      )}
                      {item.name}
                    </span>

                    {item.href === '/cart' &&
                      cartProductCount > 0 && (
                        <span
                          aria-label={`${cartProductCount} produk di cart`}
                          className={`
                            flex
                            min-h-5
                            min-w-5
                            items-center
                            justify-center
                            rounded-full
                            px-1.5
                            text-[11px]
                            font-bold
                            leading-none

                            ${
                              active
                                ? 'bg-white text-orange-600'
                                : 'bg-orange-600 text-white'
                            }
                          `}
                        >
                          {cartProductCount > 99
                            ? '99+'
                            : cartProductCount}
                        </span>
                      )}
                  </Link>
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </nav>
  )
}
