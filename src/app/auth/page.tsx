'use client'

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Auth() {

  const route = useRouter()

  useEffect(() => {
    route.replace("/auth/login")
  }, [route])

  return null
}
