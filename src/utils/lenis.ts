import Lenis from 'lenis'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

gsap.registerPlugin(ScrollTrigger)

let lenisInstance: Lenis | null = null
let tickerCallback: ((time: number) => void) | null = null
let currentAct: 1 | 2 = 1

export function initLenis(): Lenis {
  if (typeof window === 'undefined') return {} as Lenis
  if (lenisInstance) return lenisInstance

  const lenis = new Lenis({
    duration: 1.9,
    easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
    smoothWheel: true,
    wheelMultiplier: 0.4,
    touchMultiplier: 0.6,
    virtualScroll: (data) => {
      // In Shrine Act (Act 1): asymmetric clamp — scroll down is slow & cinematic, scroll up is faster for quick return
      if (currentAct === 1) {
        if (data.deltaY < 0) {
          // Scrolling UP (backward) — allow faster movement
          data.deltaY = Math.max(-35, data.deltaY)
        } else {
          // Scrolling DOWN (forward) — keep slow, meditative pace
          data.deltaY = Math.min(20, data.deltaY)
        }
        data.deltaX = 0
      }
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

export function setLenisActMode(act: 1 | 2) {
  currentAct = act
  if (lenisInstance) {
    const mult = act === 1 ? 0.4 : 1.0
    const dur = act === 1 ? 1.9 : 1.2
    lenisInstance.options.wheelMultiplier = mult
    lenisInstance.options.duration = dur
    if ((lenisInstance as any).virtualScroll?.options) {
      (lenisInstance as any).virtualScroll.options.wheelMultiplier = mult
    }
  }
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
