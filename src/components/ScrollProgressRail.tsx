import { useState, useEffect } from 'react'
import { scrollToElement, getLenis } from '../utils/lenis'

interface SectionMarker {
  id: string
  label: string
  start: number
  end: number
  mid: number
}

const SECTIONS: SectionMarker[] = [
  { id: 'projects', label: 'Projects', start: 0.0, end: 0.45, mid: 0.2 },
  { id: 'skills', label: 'Skills', start: 0.45, end: 0.8, mid: 0.6 },
  { id: 'contact', label: 'Contact', start: 0.8, end: 1.0, mid: 0.9 },
]

export default function ScrollProgressRail({ act }: { act: 1 | 2 }) {
  const [scrollProgress, setScrollProgress] = useState(0)
  const [activeSection, setActiveSection] = useState<string>('projects')

  useEffect(() => {
    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight
      if (totalScroll <= 0) return
      const progress = Math.min(Math.max(window.scrollY / totalScroll, 0), 1)
      setScrollProgress(progress)

      const active = SECTIONS.find((s) => progress >= s.start && progress <= s.end)
      if (active) {
        setActiveSection(active.id)
      }
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

  if (act === 1) {
    return (
      <div className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 hidden sm:flex flex-col items-center gap-2 select-none pointer-events-none">
        {/* Minimal Act 1 Shrine Walk Rail Track */}
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

  return (
    <div className="fixed right-3 sm:right-6 top-1/2 -translate-y-1/2 z-40 hidden sm:flex flex-col items-center gap-3 select-none pointer-events-auto">
      {/* Background Rail Track */}
      <div className="relative flex flex-col items-center py-2 px-1 rounded-full bg-black/40 backdrop-blur-md border border-white/10 shadow-lg">
        {/* Continuous Active Fill Line */}
        <div className="absolute top-3 bottom-3 w-[1.5px] bg-white/10 rounded-full overflow-hidden">
          <div
            className="w-full bg-gradient-to-b from-[#c93b2b] to-[#ffaa66] transition-all duration-150"
            style={{ height: `${scrollProgress * 100}%` }}
          />
        </div>

        {/* Section Step Dots & Labels */}
        <div className="flex flex-col gap-6 relative z-10 py-1">
          {SECTIONS.map((sec) => {
            const isActive = activeSection === sec.id
            return (
              <button
                key={sec.id}
                onClick={() => scrollToElement(`#${sec.id}`)}
                className="group relative flex items-center justify-center p-1 cursor-pointer"
                title={`Jump to ${sec.label}`}
              >
                {/* Dot */}
                <span
                  className={`block rounded-full transition-all duration-300 ${
                    isActive
                      ? 'w-2.5 h-2.5 bg-[#c93b2b] shadow-[0_0_8px_#c93b2b]'
                      : 'w-1.5 h-1.5 bg-white/40 group-hover:bg-white group-hover:scale-125'
                  }`}
                />

                {/* Floating Hover Label (Pill tooltip appearing to left) */}
                <span className="absolute right-7 px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/15 text-[10px] font-mono tracking-wider text-white uppercase opacity-0 -translate-x-1 pointer-events-none group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-200 whitespace-nowrap shadow-md">
                  {sec.label}
                </span>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
