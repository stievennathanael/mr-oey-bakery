'use client'

import { motion } from 'framer-motion'

export default function LocationCard({
  selected,
  onClick,
  title,
  address,
}: {
  selected: boolean
  onClick: () => void
  title: string
  address: string
}) {
  return (
    <motion.button
      whileHover={{
        scale: 1.03,
      }}
      whileTap={{
        scale: 0.98,
      }}
      onClick={onClick}
      className={`group relative w-full overflow-hidden rounded-2xl border p-4 text-left transition-all duration-300 sm:p-6 ${
        selected
          ? 'border-orange-300 bg-gradient-to-r from-orange-50 to-orange-100 shadow-xl'
          : 'border-gray-200 bg-white shadow-md hover:border-orange-200 hover:shadow-xl'
      }`}
    >
      {/* Glow Effect */}
      {selected && (
        <div className="absolute inset-0 bg-gradient-to-r from-orange-300/10 to-yellow-300/10" />
      )}

      <div className="relative z-10 flex items-start gap-3 sm:gap-4">
        {/* Icon */}
        <div
          className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all sm:h-14 sm:w-14 ${
            selected
              ? 'bg-orange-500 text-white'
              : 'bg-orange-100 text-orange-500'
          }`}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 sm:h-7 sm:w-7"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M17.657 16.657L13.414 20.9a2 2 0 01-2.828 0l-4.243-4.243a8 8 0 1111.314 0z"
            />

            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"
            />
          </svg>
        </div>

        <div className="flex-1">
          <h3
            className={`text-lg font-bold transition-colors ${
              selected
                ? 'text-orange-600'
                : 'text-gray-900 group-hover:text-orange-500'
            }`}
          >
            {title}
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-gray-900">
            {address}
          </p>
        </div>
      </div>

      {selected && (
        <div className="absolute right-4 top-4">
          <div className="h-3 w-3 rounded-full bg-green-500 shadow-lg shadow-green-400" />
        </div>
      )}
    </motion.button>
  )
}
