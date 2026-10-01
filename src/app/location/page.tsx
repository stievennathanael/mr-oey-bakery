"use client"

import GoogleMapComponent from '@/components/Maps'
import LocationCard from '@/components/LocationCard'
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from "framer-motion"
import { Loader2 } from 'lucide-react'
import { useAutoRefresh } from '@/hooks/use-auto-refresh'

type Location = {
  id: number
  name: string
  address: string
  map_url: string
}

export default function LocationScreen() {
  const [locations, setLocations] = useState<Location[]>([])
  const [location, setLocation] = useState(0)
  const [direction, setDirection] = useState(1)
  const [loading, setLoading] = useState(true)

  async function fetchLocations() {
    try {
      const res = await fetch('/api/locations', {
        cache: 'no-store',
      })
      const data = await res.json()

      setLocations(data)
    } catch (error) {
      console.error(error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchLocations()
  }, [])

  useAutoRefresh(fetchLocations)

  const changeLocation = (newIndex: number) => {
    setDirection(newIndex > location ? 1 : -1)
    setLocation(newIndex)
  }

  return (
    <div className="flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-orange-50 via-white to-orange-100 pt-20 sm:pt-[5rem]">
      {/* Background Decoration */}
      <div className="absolute left-0 top-20 h-72 w-72 rounded-full bg-orange-200 opacity-30 blur-3xl" />
      <div className="absolute bottom-0 right-0 h-96 w-96 rounded-full bg-orange-300 opacity-20 blur-3xl" />
      
      <h1 className="mb-8 mt-10 px-4 text-center text-3xl font-bold text-orange-500 sm:mb-12 sm:mt-14 sm:text-4xl">
        Lokasi Toko Kami
      </h1>

      {loading ? (
        <div className="flex min-h-[360px] items-center justify-center">
          <Loader2 className="h-10 w-10 animate-spin text-orange-500" />
        </div>
      ) : locations.length === 0 ? (
        <p className="px-4 text-center text-gray-900">
          Lokasi toko belum tersedia.
        </p>
      ) : (
        <div className="flex flex-col gap-6 px-4 pb-12 sm:px-6 lg:flex-row lg:gap-8 lg:px-20">

          {/* Sidebar */}
          <div className="flex w-full flex-col gap-4 lg:w-[450px] lg:gap-6">
            {locations.map((loc, index) => (
              <LocationCard
                key={loc.id}
                selected={location === index}
                onClick={() => changeLocation(index)}
                title={loc.name}
                address={loc.address}
              />
            ))}
          </div>

          {/* Map */}
          <div className="relative h-[360px] flex-1 overflow-hidden rounded-xl shadow-xl sm:h-[440px] lg:h-[500px]">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={location}
                initial={{ x: direction * 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -direction * 100, opacity: 0 }}
                transition={{ duration: 0.5 }}
                className="absolute w-full h-full"
              >
                <GoogleMapComponent
                  width="100%"
                  height="100%"
                  src={locations[location].map_url}
                />
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      )}
    </div>
  )
}
