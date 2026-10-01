'use client'

import Image from 'next/image'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  useCallback,
  useEffect,
  useState,
} from 'react'
import { motion } from 'framer-motion'
import {
  LogIn,
  LogOut,
  Mail,
  Phone,
  UserRound,
} from 'lucide-react'
import { notifyCartUpdated } from '@/lib/cart-events'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

type AccountUser = {
  id?: string | number
  name?: string
  email?: string
  phone?: string
}

export default function AccountPage() {
  const router = useRouter()

  const [user, setUser] =
    useState<AccountUser | null>(
      null
    )

  const [hasToken, setHasToken] =
    useState(false)

  const refreshAccount = useCallback(() => {
    const savedUser =
      localStorage.getItem(
        'customer_user'
      )

    const savedToken =
      localStorage.getItem(
        'customer_token'
      )

    if (savedUser) {
      try {
        setUser(
          JSON.parse(savedUser) as AccountUser
        )
      } catch {
        localStorage.removeItem(
          'customer_user'
        )
        setUser(null)
      }
    } else {
      setUser(null)
    }

    setHasToken(Boolean(savedToken))
  }, [])

  useEffect(() => {
    refreshAccount()

    window.addEventListener(
      'storage',
      refreshAccount
    )

    return () => {
      window.removeEventListener(
        'storage',
        refreshAccount
      )
    }
  }, [refreshAccount])

  useAutoRefresh(refreshAccount)

  const isLoggedIn =
    Boolean(user) || hasToken

  function handleLogout() {
    localStorage.removeItem(
      'customer_user'
    )

    localStorage.removeItem(
      'customer_token'
    )

    setUser(null)
    setHasToken(false)
    notifyCartUpdated(0)

    router.replace('/home')
  }

  return (
    <main className="relative min-h-screen overflow-x-hidden bg-gradient-to-br from-orange-50 via-white to-orange-100 px-4 pb-10 pt-28 sm:px-6 sm:pb-12 sm:pt-36">
      
      {/* Background Blur */}
      <div className="absolute -left-24 -top-24 h-80 w-80 rounded-full bg-orange-300/30 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-[360px] w-[360px] rounded-full bg-orange-200/40 blur-3xl" />

      <motion.section
        initial={{
          opacity: 0,
          y: 40,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.7,
        }}
        className="relative z-10 mx-auto grid max-w-5xl overflow-hidden rounded-3xl bg-white shadow-2xl lg:grid-cols-[0.95fr_1.05fr] lg:rounded-[28px]"
      >

        {/* ====================================== */}
        {/* LEFT */}
        {/* ====================================== */}

        <div className="flex flex-col justify-center p-5 sm:p-8 lg:p-10">
          <div className="flex flex-col items-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-orange-500 shadow-lg sm:h-24 sm:w-24">

              <UserRound
                size={40}
                className="text-white"
              />

            </div>

            <p className="mt-5 text-center text-xs font-semibold uppercase tracking-[3px] text-orange-500 sm:tracking-[4px]">
              Mr. Oey Bakery
            </p>

            <h1 className="mt-2 text-center text-xl font-bold text-gray-900 sm:text-2xl">
              Akun Pelanggan
            </h1>

          </div>

            {isLoggedIn ? (
            <>
              {/* WELCOME */}

              <div className="mt-8 text-center">

                <p className="text-sm text-gray-900">
                  Selamat Datang Kembali
                </p>

                <h2 className="mt-2 text-xl font-bold text-gray-900">
                  {user?.name ??
                    'Customer'}
                </h2>

              </div>

              {/* ACCOUNT INFO */}

              <div className="mt-8 space-y-4">

                {/* EMAIL */}

                <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:gap-4">

                  <div className="rounded-full bg-orange-100 p-3">

                    <Mail
                      size={20}
                      className="text-orange-500"
                    />

                  </div>

                  <div className="min-w-0">

                    <p className="text-sm text-gray-900">
                      Email
                    </p>

                    <p className="font-semibold text-gray-900 break-all">
                      {user?.email ||
                        '-'}
                    </p>

                  </div>

                </div>

                {/* PHONE */}

                <div className="flex min-w-0 items-center gap-3 rounded-2xl border border-orange-100 bg-orange-50 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg sm:gap-4">

                  <div className="rounded-full bg-orange-100 p-3">

                    <Phone
                      size={20}
                      className="text-orange-500"
                    />

                  </div>

                  <div className="min-w-0">

                    <p className="text-sm text-gray-900">
                      Nomor Telepon
                    </p>

                    <p className="break-all font-semibold text-gray-900">
                      {user?.phone ||
                        '-'}
                    </p>

                  </div>

                </div>

              </div>

              {/* LOGOUT */}

              <button
                onClick={
                  handleLogout
                }
                className="mt-8 flex w-full items-center justify-center gap-3 rounded-2xl bg-red-500 py-3.5 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-red-600 hover:shadow-xl active:scale-95"
              >

                <LogOut size={18} />

                Keluar

              </button>

            </>
          ) : (
            <>
              {/* GUEST */}

              <div className="mt-8 text-center">

                <h2 className="text-2xl font-bold text-gray-900">
                  Selamat Datang!
                </h2>

                <p className="mt-4 text-gray-900 leading-relaxed">
                  Login terlebih dahulu
                  untuk melihat informasi
                  akun, riwayat pesanan,
                  dan menikmati berbagai
                  layanan dari
                  Mr. Oey Bakery.
                </p>

              </div>

              {/* BUTTON */}

              <div className="mt-8 flex flex-col gap-3">

                <Link
                  href="/auth/login"
                  className="flex items-center justify-center gap-2 rounded-2xl bg-orange-500 py-3.5 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-orange-600 hover:shadow-lg"
                >

                  <LogIn size={18} />

                  Masuk

                </Link>

                <Link
                  href="/auth/register"
                  className="flex items-center justify-center rounded-2xl border-2 border-orange-500 py-3.5 font-semibold text-orange-500 transition-all duration-300 hover:bg-orange-50"
                >
                  Daftar
                </Link>

              </div>

            </>
          )}

        </div>

        {/* ====================================== */}
        {/* RIGHT */}
        {/* ====================================== */}

        <div className="relative flex items-center justify-center overflow-hidden bg-gradient-to-br from-orange-500 via-orange-400 to-orange-600 p-6 sm:p-8 lg:p-10">

          {/* Background Decoration */}
          <div className="absolute -top-10 -right-10 h-40 w-40 rounded-full bg-white/10" />
          <div className="absolute bottom-8 left-8 h-28 w-28 rounded-full bg-white/10" />
          <div className="absolute left-1/2 top-1/2 h-60 w-60 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/20" />

          {/* Content */}

          <motion.div
            initial={{
              opacity: 0,
              scale: 0.9,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
            transition={{
              delay: 0.3,
              duration: 0.6,
            }}
            className="relative z-10 flex flex-col items-center text-center"
          >

            <Image
              src="/logo.png"
              alt="Mr. Oey Bakery"
              width={210}
              height={210}
              priority
              className="h-36 w-36 drop-shadow-2xl sm:h-[210px] sm:w-[210px]"
            />

            <h2 className="mt-5 text-2xl font-bold text-white sm:mt-6 sm:text-3xl">
              Mr. Oey Bakery
            </h2>

            <p className="mt-4 max-w-xs text-base leading-relaxed text-orange-100">
              Dipanggang Segar Setiap Hari dengan Sepenuh Hati Menghadirkan Kualitas Terbaik Dalam Setiap Gigitan.
            </p>

          </motion.div>

        </div>

      </motion.section>
    </main>
  )
}
