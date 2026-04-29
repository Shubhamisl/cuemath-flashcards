'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

const ROUTES = ['/library', '/progress', '/profile'] as const

export function NavRouteWarmer() {
  const router = useRouter()

  useEffect(() => {
    for (const route of ROUTES) {
      router.prefetch(route)
    }
  }, [router])

  return null
}
