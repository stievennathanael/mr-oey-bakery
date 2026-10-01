'use client'

import axios from "axios";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function Page() {

  const route = useRouter()

  axios.defaults.baseURL = "http://192.168.100.252/mroey/user",

  useEffect(() => {
    route.replace("/home")
  }, [route])

  return null
}
