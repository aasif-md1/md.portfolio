import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenisInstance: Lenis | null = null
let tickerCallback: ((time: number) => void) | null = null

export function initLenis(): Lenis {
  if (typeof window === 'undefined') return {} as Lenis
  if (lenisInstance) return lenisInstance

  const lenis = new Lenis({
    duration: 1.2,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.55,
    touchMultiplier: 0.85,
    virtualScroll: (data) => {
      data.deltaX = 0
      // Responsive delta governor: caps individual scroll impulses smoothly without choking natural wheel motion
      data.deltaY = Math.max(-28, Math.min(28, data.deltaY))
      return true
    },
  })

  // Hook Lenis into GSAP's ScrollTrigger
  lenis.on('scroll', () => {
    ScrollTrigger.update()
  })

  // Synchronize with GSAP ticker loop
  tickerCallback = (time: number) => {
    lenis.raf(time * 1000)
  }
  gsap.ticker.add(tickerCallback)
  gsap.ticker.lagSmoothing(0)

  // Notify ScrollTrigger once Lenis is ready
  ScrollTrigger.refresh()

  lenisInstance = lenis
  return lenis
}

export function getLenis(): Lenis | null {
  return lenisInstance
}

export function scrollToTop(immediate = true) {
  if (lenisInstance) {
    lenisInstance.scrollTo(0, { immediate })
  } else if (typeof window !== 'undefined') {
    window.scrollTo({ top: 0, left: 0, behavior: immediate ? 'instant' : 'smooth' })
  }
}

export function scrollToElement(target: string | HTMLElement, options?: { offset?: number; immediate?: boolean }) {
  if (lenisInstance) {
    lenisInstance.scrollTo(target, {
      offset: options?.offset ?? 0,
      immediate: options?.immediate ?? false,
    })
  } else {
    const el = typeof target === 'string' ? document.querySelector(target) : target
    if (el) {
      el.scrollIntoView({ behavior: options?.immediate ? 'instant' : 'smooth' })
    }
  }
}

export function destroyLenis() {
  if (lenisInstance) {
    if (tickerCallback) {
      gsap.ticker.remove(tickerCallback)
      tickerCallback = null
    }
    lenisInstance.destroy()
    lenisInstance = null
  }
}
