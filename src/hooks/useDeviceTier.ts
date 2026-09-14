import { useState, useEffect } from 'react'

export interface DeviceTier {
  isMobile: boolean
  dpr: number
  shadows: boolean
  shadowMapSize: number
}

export function useDeviceTier(): DeviceTier {
  const checkTier = (): DeviceTier => {
    if (typeof window === 'undefined') {
      return { isMobile: false, dpr: 2, shadows: true, shadowMapSize: 2048 }
    }
    const isTouch = navigator.maxTouchPoints > 0 || 'ontouchstart' in window
    const isNarrow = window.innerWidth < 768
    const isMobile = isNarrow || (isTouch && window.innerWidth < 1024)

    return {
      isMobile,
      dpr: isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2),
      shadows: !isMobile,
      shadowMapSize: isMobile ? 512 : 2048,
    }
  }

  const [tier, setTier] = useState<DeviceTier>(checkTier)

  useEffect(() => {
    const handleResize = () => {
      setTier(checkTier())
    }
    window.addEventListener('resize', handleResize, { passive: true })
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return tier
}
