'use client'

import { useEffect, useRef } from 'react'

type AutoRefreshCallback = () => void | Promise<void>

type UseAutoRefreshOptions = {
  enabled?: boolean
  intervalMs?: number
}

/**
 * Menjalankan callback secara berkala selama halaman sedang terlihat.
 * Callback disimpan dalam ref agar interval tidak dibuat ulang setiap render.
 */
export function useAutoRefresh(
  callback: AutoRefreshCallback,
  {
    enabled = true,
    intervalMs = 30000,
  }: UseAutoRefreshOptions = {}
) {
  const callbackRef = useRef(callback)

  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (!enabled) {
      return
    }

    let isRunning = false

    const run = () => {
      if (
        document.visibilityState !== 'visible' ||
        isRunning
      ) {
        return
      }

      isRunning = true

      Promise.resolve(callbackRef.current())
        .catch((error) => {
          console.error('Auto refresh gagal', error)
        })
        .finally(() => {
          isRunning = false
        })
    }

    const intervalId = window.setInterval(
      run,
      intervalMs
    )

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        run()
      }
    }

    document.addEventListener(
      'visibilitychange',
      handleVisibilityChange
    )
    window.addEventListener('focus', run)

    return () => {
      window.clearInterval(intervalId)
      document.removeEventListener(
        'visibilitychange',
        handleVisibilityChange
      )
      window.removeEventListener('focus', run)
    }
  }, [enabled, intervalMs])
}
