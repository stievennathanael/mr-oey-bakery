'use client'

import Image from 'next/image'
import { useRouter } from 'next/navigation'
import React, {
  useEffect,
  useRef,
  useState,
} from 'react'
import {
  AnimatePresence,
  motion,
} from 'framer-motion'
import {
  CircleCheckBig,
  CircleX,
  Loader2,
  TriangleAlert,
  Eye,
  EyeOff,
} from 'lucide-react'

const SUCCESS_DURATION = 2000

type AlertType =
  | 'success'
  | 'warning'
  | 'error'

export default function LoginScreen() {
  const router = useRouter()

  const [email, setEmail] =
    useState('')

  const [password, setPassword] =
    useState('')

  const [showPassword, setShowPassword] =
    useState(false)

  const [loading, setLoading] =
    useState(false)

  {/* ================= ALERT MODAL ================= */}
  const [alertOpen, setAlertOpen] =
    useState(false)

  const [alertData, setAlertData] =
    useState({
      type:
        'success' as AlertType,
      title: '',
      message: '',
    })

  const alertResolveRef =
    useRef<(() => void) | null>(
      null
    )

  function showAlert(
    type: AlertType,
    title: string,
    message: string
  ) {
    return new Promise<void>(
      (resolve) => {
        setAlertData({
          type,
          title,
          message,
        })

        setAlertOpen(true)

        if (type === 'success') {
          setTimeout(() => {
            setAlertOpen(false)
            resolve()
          }, SUCCESS_DURATION)
        } else {
          alertResolveRef.current =
            resolve
        }
      }
    )
  }

  function closeAlert() {
    setAlertOpen(false)

    if (
      alertResolveRef.current
    ) {
      alertResolveRef.current()
      alertResolveRef.current =
        null
    }
  }

  useEffect(() => {
    document.body.classList.toggle(
      'overflow-hidden',
      alertOpen
    )

    return () => {
      document.body.classList.remove(
        'overflow-hidden'
      )
    }
  }, [alertOpen])

  {/* ================= LOGIN ================= */}
  async function onLogin() {
    if (!email.trim()) {
      await showAlert(
        'warning',
        'Email Wajib Diisi',
        'Silakan masukkan alamat email Anda.'
      )
      return
    }

    if (!password.trim()) {
      await showAlert(
        'warning',
        'Password Wajib Diisi',
        'Silakan masukkan password Anda.'
      )
      return
    }

    try {
      setLoading(true)

      const response =
        await fetch(
          '/api/auth/login',
          {
            method: 'POST',
            headers: {
              'Content-Type':
                'application/json',
            },
            body: JSON.stringify({
              email,
              password,
            }),
          }
        )

      const data =
        await response.json()

      if (!response.ok) {
        await showAlert(
          'error',
          'Gagal Masuk',
          data.message ||
            'Gagal Masuk.'
        )

        return
      }

      {/* ================= SAVE USER ================= */}
      if (
        data.user?.role ===
        'admin'
      ) {
        localStorage.setItem(
          'admin_user',
          JSON.stringify(data.user)
        )

        localStorage.setItem(
          'admin_token',
          data.token || 'logged'
        )

        window.dispatchEvent(
          new Event(
            'admin-auth-changed'
          )
        )
      } else {
        localStorage.setItem(
          'customer_user',
          JSON.stringify(data.user)
        )

        localStorage.setItem(
          'customer_token',
          data.token || 'logged'
        )
      }

      {/* ================= SUCCESS ================= */}
      await showAlert(
        'success',
        'Berhasil Masuk',
        'Selamat datang kembali di Mr. Oey Bakery!'
      )

      router.replace(
        data.user?.role ===
          'admin'
          ? '/admin/dashboard'
          : '/home'
      )
    } catch (error) {
      console.error(error)

      await showAlert(
        'error',
        'Ups...',
        'Terjadi kesalahan. Silakan coba lagi.'
      )
    } finally {
      setLoading(false)
    }
  }

    return (
    <div className="relative flex min-h-[100svh] items-center justify-center overflow-x-hidden overflow-y-auto bg-gradient-to-b from-orange-50 via-white to-orange-100 px-4 py-6 sm:py-10">

      {/* Background */}

      <div className="absolute left-0 top-0 h-72 w-72 rounded-full bg-orange-300 opacity-30 blur-3xl" />

      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-yellow-200 opacity-40 blur-3xl" />

      <motion.div
        initial={{
          opacity: 0,
          y: 40,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        transition={{
          duration: 0.6,
        }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-3xl border border-white/40 bg-white/80 p-5 shadow-[0_25px_80px_rgba(0,0,0,0.25)] backdrop-blur-xl sm:p-8">

          {/* Logo */}

          <div className="flex flex-col items-center">
            <Image
              src="/logo.png"
              alt="Mr Oey Bakery"
              width={120}
              height={120}
              priority
              className="rounded-xl"
            />

            <h1 className="mt-3 text-center text-2xl font-bold text-orange-500 sm:text-3xl">
              Mr. Oey Bakery
            </h1>

            <p className="mt-3 text-center text-sm leading-relaxed text-gray-900 sm:text-base">
              Selamat datang! Silakan masuk untuk melanjutkan pemesanan produk favorit Anda
            </p>
          </div>

          {/* FORM */}

          <form
            className="mt-8 space-y-5"
            onSubmit={(e) => {
              e.preventDefault()
              onLogin()
            }}
          >

            {/* EMAIL */}

            <div>
              <label className="mb-2 block font-medium text-gray-900">
                Email
              </label>

              <input
                type="email"
                placeholder="prabowosubianto@gmail.com"
                value={email}
                onChange={(e) =>
                  setEmail(
                    e.target.value
                  )
                }
                className="w-full rounded-xl border border-gray-300 px-4 py-3 text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-300"
              />
            </div>

            {/* PASSWORD */}

            <div>
              <label className="mb-2 block font-medium text-gray-900">
                Password
              </label>

              <div className="relative">

                <input
                  type={
                    showPassword
                      ? 'text'
                      : 'password'
                  }
                  placeholder="Masukkan password"
                  value={password}
                  onChange={(e) =>
                    setPassword(
                      e.target.value
                    )
                  }
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-12 text-gray-900 outline-none transition-all duration-200 placeholder:text-gray-400 focus:border-orange-500 focus:ring-2 focus:ring-orange-300"
                />

                <button
                  type="button"
                  onClick={() =>
                    setShowPassword(
                      !showPassword
                    )
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 transition hover:text-orange-500"
                  aria-label={
                    showPassword
                      ? 'Sembunyikan password'
                      : 'Tampilkan password'
                  }
                >

                  {showPassword ? (
                    <EyeOff size={20} />
                  ) : (
                    <Eye size={20} />
                  )}

                </button>

              </div>
            </div>

            {/* LOGIN BUTTON */}

            <button
              type="submit"
              disabled={loading}
              className="flex w-full items-center justify-center rounded-xl bg-orange-500 py-3 font-semibold text-white transition-all duration-200 hover:scale-[1.02] hover:bg-orange-600 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  Sedang Masuk...
                </>
              ) : (
                'Masuk'
              )}
            </button>

            {/* REGISTER */}

            <div className="pt-2 text-center">
              <p className="text-gray-900">
                Belum punya akun?
              </p>

              <button
                type="button"
                disabled={loading}
                onClick={() =>
                  router.replace(
                    '/auth/register'
                  )
                }
                className="mt-2 font-semibold text-orange-500 transition hover:text-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Daftar di Sini
              </button>
            </div>

          </form>

        </div>
      </motion.div>

      {/* ================= ALERT MODAL ================= */}
      <AnimatePresence>
        {alertOpen && (
          <motion.div
            initial={{
              opacity: 0,
            }}
            animate={{
              opacity: 1,
            }}
            exit={{
              opacity: 0,
            }}
            transition={{
              duration: 0.2,
            }}
            className="fixed inset-0 z-[999] flex items-center justify-center overflow-y-auto bg-black/40 p-4 backdrop-blur-sm sm:p-5"
          >
            <motion.div
              initial={{
                opacity: 0,
                scale: 0.9,
                y: 20,
              }}
              animate={{
                opacity: 1,
                scale: 1,
                y: 0,
              }}
              exit={{
                opacity: 0,
                scale: 0.9,
                y: 20,
              }}
              transition={{
                duration: 0.25,
              }}
              className="w-full max-w-md overflow-hidden rounded-3xl bg-white shadow-[0_25px_80px_rgba(0,0,0,0.25)]"
            >
              <div className="p-5 sm:p-8">

                {/* ICON */}

                <div className="flex justify-center">
                  {alertData.type ===
                    'success' && (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100">
                      <CircleCheckBig className="h-12 w-12 text-green-600" />
                    </div>
                  )}

                  {alertData.type ===
                    'warning' && (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-orange-100">
                      <TriangleAlert className="h-12 w-12 text-orange-600" />
                    </div>
                  )}

                  {alertData.type ===
                    'error' && (
                    <div className="flex h-20 w-20 items-center justify-center rounded-full bg-red-100">
                      <CircleX className="h-12 w-12 text-red-600" />
                    </div>
                  )}
                </div>

                {/* TITLE */}

                <h2 className="mt-6 text-center text-xl font-bold text-slate-900 sm:text-2xl">
                  {alertData.title}
                </h2>

                {/* MESSAGE */}

                <p className="mt-3 text-center leading-7 text-slate-900">
                  {alertData.message}
                </p>

                {/* BUTTON */}

                {alertData.type !==
                  'success' && (
                  <button
                    type="button"
                    onClick={
                      closeAlert
                    }
                    className={`mt-8 w-full rounded-2xl py-3 font-semibold text-white transition-all duration-200 hover:scale-[1.02] active:scale-95 ${
                      alertData.type ===
                      'warning'
                        ? 'bg-orange-600 hover:bg-orange-700'
                        : 'bg-red-600 hover:bg-red-700'
                    }`}
                  >
                    OK
                  </button>
                )}

                {/* SUCCESS PROGRESS */}

                {alertData.type ===
                  'success' && (
                  <div className="mt-8 overflow-hidden rounded-full bg-slate-200">
                    <motion.div
                      initial={{
                        width: '100%',
                      }}
                      animate={{
                        width: '0%',
                      }}
                      transition={{
                        duration:
                          SUCCESS_DURATION /
                          1000,
                        ease: 'linear',
                      }}
                      className="h-1.5 rounded-full bg-green-600"
                    />
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
