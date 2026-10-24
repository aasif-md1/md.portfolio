import { ChevronDown } from 'lucide-react'
import { scrollToTop } from '../utils/lenis'
import type { GyroStatus } from './Scene'

interface UIOverlayProps {
  gyroStatus: GyroStatus
  onContinue?: () => void
  isTransitioning?: boolean
}

export default function UIOverlay({ gyroStatus, onContinue, isTransitioning }: UIOverlayProps) {
  return (
    <div className={`relative z-10 w-full pointer-events-none transition-opacity duration-300 ${
      isTransitioning ? 'opacity-0' : 'opacity-100'
    }`}>
      {/* Mobile touch-drag fallback hint when gyro is denied or unsupported */}
      {(gyroStatus === 'denied' || gyroStatus === 'unsupported') && (
        <div className="fixed bottom-14 left-4 sm:left-8 z-50 pointer-events-none md:hidden">
          <div className="px-3 py-1 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[10px] font-mono text-[#ddd] flex items-center gap-1.5 shadow-lg">
            <span className="w-1.5 h-1.5 rounded-full bg-[#c93b2b] animate-ping" />
            <span>Drag to look around</span>
          </div>
        </div>
      )}

      {/* ============================ SAKURA SHRINE WALK ======================= */}
      <div id="scroll-container" className="text-[#161216]">
        {/* Minimal Clean Hero Viewport (Name & introduction removed as requested) */}
        <section className="h-screen flex flex-col justify-end p-5 sm:p-8 md:p-14 select-none relative">
          {/* Bottom-Left Minimal Pure Text Scroll Indicator */}
          <div className="pointer-events-none self-start pb-2 flex items-center gap-2 font-mono text-[11px] font-bold tracking-[0.25em] uppercase text-[#161216]">
            <span>SCROLL TO WALK</span>
            <ChevronDown size={14} className="animate-bounce text-[#c93b2b]" />
          </div>
        </section>

        {/* Shortened comfortable scroll runway: 140vh provides a swift, satisfying journey to sanctum */}
        <div className="h-[140vh] w-full pointer-events-none" aria-hidden="true" />

        {/* End Milestone: Outlined "CLICK TO CONTINUE" matching exact original design */}
        <section className="h-screen flex flex-col items-center justify-center select-none pointer-events-none w-full overflow-hidden">
          <button
            id="continue-btn"
            onClick={onContinue || (() => scrollToTop(false))}
            className="pointer-events-auto cursor-pointer text-center w-full h-[65vh] md:h-[75vh] flex flex-col items-center justify-center transition-transform duration-200 hover:scale-[1.02] will-change-transform px-4"
          >
            <h2
              className="pointer-events-auto whitespace-nowrap text-3xl sm:text-5xl md:text-7xl lg:text-8xl xl:text-9xl font-bold font-movement uppercase tracking-wider transition-colors duration-200 text-transparent hover:text-[#161216] hover:[-webkit-text-fill-color:#161216] hover:[-webkit-text-stroke-color:#161216]"
              style={{ WebkitTextStroke: '2px #161216' }}
            >
              Click to continue
            </h2>
          </button>
        </section>
      </div>
    </div>
  )
}
