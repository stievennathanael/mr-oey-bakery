'use client'

import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function Page() {
  const route = useRouter()

  useEffect(() => {
    route.replace('/home')
  }, [route])

  return null
}
