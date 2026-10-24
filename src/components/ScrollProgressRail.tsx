import { useState, useEffect } from 'react'
import { getLenis } from '../utils/lenis'

export default function ScrollProgressRail() {
  const [scrollProgress, setScrollProgress] = useState(0)

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight
      if (totalScroll <= 0) return
      const progress = Math.min(Math.max(window.scrollY / totalScroll, 0), 1)
      setScrollProgress(progress)
    }

    const lenis = getLenis()
    if (lenis) {
      lenis.on('scroll', handleScroll)
    }
    window.addEventListener('scroll', handleScroll, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      if (lenis) {
        lenis.off('scroll', handleScroll)
      }
    }
  }, [])

  return (
    <div className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 hidden sm:flex flex-col items-center gap-2 select-none pointer-events-none">
      {/* Minimal Shrine Walk Rail Track */}
      <div className="relative flex flex-col items-center py-2 px-1 rounded-full bg-black/[0.08] backdrop-blur-md border border-black/10 shadow-sm w-3 h-32">
        {/* Continuous Active Fill Line */}
        <div className="absolute top-2 bottom-2 w-[2px] bg-black/10 rounded-full overflow-hidden">
          <div
            className="w-full bg-gradient-to-b from-[#c93b2b] to-[#8a2318] transition-all duration-100 rounded-full"
            style={{ height: `${scrollProgress * 100}%` }}
          />
        </div>
      </div>
    </div>
  )
}
