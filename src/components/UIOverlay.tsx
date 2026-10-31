import { ChevronDown } from 'lucide-react'
import type { GyroStatus } from './Scene'
import PortfolioTypographyHero from './PortfolioTypographyHero'

interface UIOverlayProps {
  gyroStatus: GyroStatus
  onContinue?: () => void
  isTransitioning?: boolean
  isLoaded?: boolean
}

export default function UIOverlay({
  gyroStatus,
  onContinue,
  isTransitioning,
  isLoaded = false,
}: UIOverlayProps) {
  return (
    <div
      className={`relative z-10 w-full pointer-events-none transition-opacity duration-300 ${
        isTransitioning ? 'opacity-0' : 'opacity-100'
      }`}
    >
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
        {/* Pinned Premium Animated PORTFOLIO Typography Hero Section */}
        <PortfolioTypographyHero isLoaded={isLoaded} onContinue={onContinue} />

        {/* Bottom-Left Minimal Pure Text Scroll Indicator Matching Screenshot */}
        <div className="fixed bottom-4 sm:bottom-7 left-4 sm:left-8 md:left-14 z-30 pointer-events-none pb-safe flex items-center gap-1.5 sm:gap-2 font-mono text-[10px] sm:text-[11px] font-bold tracking-[0.2em] sm:tracking-[0.25em] uppercase text-[#161216]">
          <span>SCROLL TO WALK</span>
          <ChevronDown size={14} className="animate-bounce text-[#8A0000]" />
        </div>
      </div>
    </div>
  )
}
