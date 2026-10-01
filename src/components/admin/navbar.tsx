'use client'

import { useEffect, useState } from 'react'
import { Menu } from 'lucide-react'

type User = {
  id: number
  name: string
  email: string
  role: string
}

type AdminNavbarProps = {
  onMenuClick: () => void
}

export default function AdminNavbar({
  onMenuClick,
}: AdminNavbarProps) {
  const [greeting, setGreeting] =
    useState('Selamat Pagi')

  const [user, setUser] =
    useState<User | null>(null)

  useEffect(() => {
    const hour = new Date().getHours()

    if (hour >= 5 && hour < 12) {
      setGreeting('Selamat Pagi')
    } else if (
      hour >= 12 &&
      hour < 17
    ) {
      setGreeting('Selamat Siang')
    } else {
      setGreeting('Selamat Malam')
    }

    const loadUser = () => {
      const adminUser =
        localStorage.getItem(
          'admin_user'
        )

      if (adminUser) {
        try {
          setUser(
            JSON.parse(adminUser)
          )
        } catch {
          setUser(null)

          localStorage.removeItem(
            'admin_user'
          )
        }
      } else {
        setUser(null)
      }
    }

    loadUser()

    window.addEventListener(
      'admin-auth-changed',
      loadUser
    )

    return () => {
      window.removeEventListener(
        'admin-auth-changed',
        loadUser
      )
    }
  }, [])

  const getInitials = (name?: string) => {
    if (!name) return ''

    const words = name
      .trim()
      .split(' ')
      .filter(Boolean)

    if (words.length === 1) {
      return words[0]
        .charAt(0)
        .toUpperCase()
    }

    return (
      words[0].charAt(0) +
      words[1].charAt(0)
    ).toUpperCase()
  }

  return (
    <div
      className="
        sticky
        top-0
        z-40
        flex
        items-center
        justify-between
        gap-4
        border-b
        bg-white
        px-4
        py-3
        shadow-sm
        sm:px-6
        lg:px-8
        lg:py-4
      "
    >
      <div className="flex min-w-0 items-center gap-3">
        <button
          type="button"
          aria-label="Buka menu admin"
          onClick={onMenuClick}
          className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-slate-50 lg:hidden"
        >
          <Menu className="h-5 w-5" />
        </button>

        <div className="min-w-0">
        <h1
          className="
            truncate
            text-lg
            font-bold
            text-gray-900
            sm:text-2xl
          "
        >
          {greeting}
          {user?.name
            ? `, ${user.name}`
            : ''}
        </h1>
        </div>
      </div>

      <div
        className="
          flex
          items-center
          gap-4
        "
      >
        <div
          className="
            flex
            h-10
            w-10
            items-center
            justify-center
            rounded-full
            bg-orange-500
            font-bold
            text-white
          "
        >
          {getInitials(user?.name)}
        </div>
      </div>
    </div>
  )
}
