import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { PORTFOLIO_VECTORS, getLetterLayout } from './portfolioVectors'

gsap.registerPlugin(ScrollTrigger)

interface PortfolioTypographyHeroProps {
  isLoaded: boolean
  onContinue?: () => void
}

export default function PortfolioTypographyHero({
  isLoaded,
  onContinue,
}: PortfolioTypographyHeroProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const exitWrappersRef = useRef<(HTMLDivElement | null)[]>([])
  const entranceWrappersRef = useRef<(HTMLDivElement | null)[]>([])
  const continueContainerRef = useRef<HTMLDivElement>(null)
  const continueBtnRef = useRef<HTMLButtonElement>(null)
  const reducedMotion = useReducedMotion()

  const entranceTimelineRef = useRef<gsap.core.Timeline | null>(null)
  const exitTimelineRef = useRef<gsap.core.Timeline | null>(null)
  const scrollTriggerRef = useRef<ScrollTrigger | null>(null)

  // Track responsive screen mode (mobile portrait vs desktop/landscape)
  const [isMobile, setIsMobile] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false
    return window.innerWidth < 768 || (window.innerWidth < 1024 && window.innerHeight > window.innerWidth)
  })

  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768 || (window.innerWidth < 1024 && window.innerHeight > window.innerWidth)
      setIsMobile((prev) => (prev !== mobile ? mobile : prev))
      ScrollTrigger.refresh()
    }
    window.addEventListener('resize', handleResize, { passive: true })
    window.addEventListener('orientationchange', handleResize, { passive: true })
    return () => {
      window.removeEventListener('resize', handleResize)
      window.removeEventListener('orientationchange', handleResize)
    }
  }, [])

  useEffect(() => {
    if (!isLoaded || !containerRef.current) return

    const entranceWrappers = entranceWrappersRef.current.filter(Boolean) as HTMLDivElement[]
    const exitWrappers = exitWrappersRef.current.filter(Boolean) as HTMLDivElement[]
    const continueBtn = continueBtnRef.current
    const continueContainer = continueContainerRef.current

    if (reducedMotion) {
      // Immediate placement for reduced motion preference
      gsap.set(entranceWrappers, { y: 0, opacity: 1 })
      gsap.set(exitWrappers, { y: 0, opacity: 1 })
      if (continueBtn && continueContainer) {
        gsap.set(continueContainer, { pointerEvents: 'none' })
        gsap.set(continueBtn, { opacity: 1, y: 0, pointerEvents: 'auto' })
      }
      return
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 1. Initial State Setup
    // Ensure letters start below viewport and continue button is below and non-interactive
    // ──────────────────────────────────────────────────────────────────────────
    gsap.set(entranceWrappers, {
      y: () => window.innerHeight * 0.95,
      opacity: 0,
    })
    gsap.set(exitWrappers, { y: 0 })

    if (continueContainer && continueBtn) {
      gsap.set(continueContainer, {
        pointerEvents: 'none',
      })
      gsap.set(continueBtn, {
        opacity: 0,
        y: () => window.innerHeight * 0.7, // Deep below screen so it visibly glides up on scroll
        pointerEvents: 'none',
      })
    }

    // ──────────────────────────────────────────────────────────────────────────
    // 2. Entrance Animation Timeline: P → O → R → T → F → O → L → I → O
    // Each letter enters rising smoothly from below with a deliberate cinematic glide
    // ──────────────────────────────────────────────────────────────────────────
    const entranceTl = gsap.timeline({
      delay: 0.2,
      onComplete: () => {
        ScrollTrigger.refresh()
      },
    })
    entranceTimelineRef.current = entranceTl

    entranceWrappers.forEach((wrapper, index) => {
      entranceTl.fromTo(
        wrapper,
        {
          y: () => window.innerHeight * 0.95,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: isMobile ? 0.9 : 1.1,
          ease: 'power3.out',
        },
        index * (isMobile ? 0.09 : 0.12) // Controlled sequence so each letter has its distinct rising moment
      )
    })

    // ──────────────────────────────────────────────────────────────────────────
    // 3. Scroll-Driven Sequential Exit Animation (GSAP ScrollTrigger Pinned)
    // Strictly sequence: P → O → R → T → F → O → L → I → O one by one
    // Each letter travels exactly the distance needed to clear the top edge,
    // immediately handing off to the next letter with ZERO dead scroll gaps!
    // ──────────────────────────────────────────────────────────────────────────
    const exitTl = gsap.timeline({
      paused: true,
      defaults: { ease: 'none' }, // Linear scrub within each letter ensures smooth, continuous scroll response
    })
    exitTimelineRef.current = exitTl

    exitWrappers.forEach((wrapper) => {
      if (!wrapper) return
      // Calculate dynamic exit distance: ensures letter clears top of viewport with safety buffer
      const getLetterExitDistance = () => {
        const rect = wrapper.getBoundingClientRect()
        if (rect && rect.bottom > 0) {
          return -(rect.bottom + 50)
        }
        return -(window.innerHeight * 0.9)
      }

      exitTl.to(wrapper, {
        y: getLetterExitDistance,
        duration: 1.0,
      })
    })

    // ──────────────────────────────────────────────────────────────────────────
    // 4. "CLICK TO CONTINUE" Final Reveal: Smooth Rise Up From Bottom
    // Strictly revealed AFTER the final 'O' completes its exit
    // Glides upward from below (y: 70vh -> 0) while fading in on scroll
    // ──────────────────────────────────────────────────────────────────────────
    if (continueContainer && continueBtn) {
      exitTl.fromTo(
        continueBtn,
        {
          y: () => window.innerHeight * 0.7,
          opacity: 0,
        },
        {
          y: 0,
          opacity: 1,
          duration: 1.5,
          ease: 'power1.out',
          onUpdate: function () {
            const prog = this.progress()
            if (prog > 0.05) {
              continueBtn.style.pointerEvents = 'auto'
            } else {
              continueBtn.style.pointerEvents = 'none'
            }
          },
          onReverseComplete: () => {
            continueBtn.style.pointerEvents = 'none'
          },
        },
        '+=0.1'
      )

      // Hold milestone at center of screen so the user can easily see and click it
      exitTl.to({}, { duration: 1.0 })
    }

    const scrollRunway = isMobile ? 3200 : 4800
    const st = ScrollTrigger.create({
      trigger: containerRef.current,
      start: 'top top',
      end: `+=${scrollRunway}`,
      pin: true,
      pinSpacing: true,
      scrub: isMobile ? 0.65 : 0.8,
      animation: exitTl,
      anticipatePin: 1,
      invalidateOnRefresh: true,
    })
    scrollTriggerRef.current = st

    return () => {
      entranceTl.kill()
      exitTl.kill()
      st.kill()
    }
  }, [isLoaded, reducedMotion, isMobile])

  return (
    <div
      ref={containerRef}
      id="portfolio-hero"
      className="relative w-full h-screen overflow-hidden select-none pointer-events-none"
      style={{ zIndex: 25 }}
    >
      {/* 
        Exact Reference Letter Typography:
        Extracted directly from the reference Canva composition.
        Each letter sits at its exact percentage coordinates matching the Torii scene.
      */}
      <div className="absolute inset-0 w-full h-full pointer-events-none">
        {PORTFOLIO_VECTORS.map((item, index) => {
          const layout = getLetterLayout(item, isMobile)
          return (
            <div
              key={item.id}
              className="absolute will-change-transform pointer-events-none"
              style={{
                left: `${layout.leftPct}%`,
                top: `${layout.topPct}%`,
                width: `${layout.widthPct}%`,
                height: `${layout.heightPct}%`,
              }}
            >
              {/* ScrollTrigger exit wrapper (translates smoothly up beyond top of viewport) */}
              <div
                ref={(el) => {
                  exitWrappersRef.current[index] = el
                }}
                className="w-full h-full will-change-transform pointer-events-none"
              >
                {/* GSAP entrance wrapper (translates smoothly up from bottom upon load) */}
                <div
                  ref={(el) => {
                    entranceWrappersRef.current[index] = el
                  }}
                  className="w-full h-full will-change-transform pointer-events-none"
                  style={{
                    transform: 'translateY(95vh)',
                    opacity: 0,
                  }}
                >
                  {/* 
                    Individual Letter SVG Vector:
                    - SVG has pointer-events: none so empty space around letter NEVER triggers hover
                    - Only the <path> has pointer-events: all so hover/touch triggers ONLY on the letter itself!
                  */}
                  <svg
                    viewBox={item.viewBox}
                    className="portfolio-letter-svg w-full h-full overflow-visible select-none"
                  >
                    <path
                      d={item.d}
                      fillRule="evenodd"
                      className="portfolio-letter-path"
                    />
                  </svg>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* 
        Exact Original "Click to continue" Milestone Reveal:
        - Outlined uppercase typography matching exact original design (font-movement, WebkitTextStroke: '2px #161216')
        - Strictly hidden during initial load, entrance, and letter exits
        - pointer-events: none while hidden so it never intercepts letter hovers
        - Glides smoothly up from the bottom (y: 70vh -> 0) while scrolling past the 9th letter
        - On hover: fills solidly with #161216 via .continue-hero-title:hover
      */}
      <div
        ref={continueContainerRef}
        className="absolute inset-0 flex items-center justify-center select-none pointer-events-none w-full h-full z-30"
      >
        <button
          ref={continueBtnRef}
          id="continue-btn"
          onClick={onContinue}
          className="continue-hero-btn pointer-events-none opacity-0 cursor-pointer text-center inline-flex items-center justify-center py-2.5 px-5 sm:py-4 sm:px-8 rounded-2xl transition-transform duration-200 hover:scale-[1.02] will-change-transform max-w-[95vw]"
        >
          <h2
            className="continue-hero-title whitespace-nowrap text-xl sm:text-3xl md:text-5xl lg:text-7xl xl:text-8xl 2xl:text-9xl font-bold font-movement uppercase tracking-wider text-center"
          >
            Click to continue
          </h2>
        </button>
      </div>
    </div>
  )
}
