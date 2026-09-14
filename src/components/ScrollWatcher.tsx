import { useEffect } from 'react'

// This component wires the drei ScrollControls internal scroll to section visibility
// It listens to the drei scroll div and fades panels in/out
export default function ScrollWatcher() {
  useEffect(() => {
    // drei ScrollControls creates a div with overflow-y scroll — find it
    const findScrollEl = () => {
      // It's the first fixed div with overflow-y scroll inside the canvas wrapper
      const allDivs = document.querySelectorAll('div')
      for (const d of allDivs) {
        const style = window.getComputedStyle(d)
        if (style.overflow === 'hidden scroll' || style.overflowY === 'scroll') {
          return d
        }
      }
      return null
    }

    let scrollEl: Element | null = null
    const tryFind = () => {
      scrollEl = findScrollEl()
      if (!scrollEl) {
        setTimeout(tryFind, 200)
        return
      }
      scrollEl.addEventListener('scroll', onScroll)
      onScroll()
    }

    const panels = [
      { id: 'About', start: 0.12, end: 0.35 },
      { id: 'Skills', start: 0.35, end: 0.55 },
      { id: 'Projects', start: 0.55, end: 0.78 },
      { id: 'Contact', start: 0.78, end: 1.0 },
    ]

    const onScroll = () => {
      let progress = 0
      if (scrollEl) {
        const el = scrollEl as HTMLElement
        const total = el.scrollHeight - el.clientHeight
        progress = total > 0 ? el.scrollTop / total : 0
      } else if (typeof window !== 'undefined') {
        const total = document.documentElement.scrollHeight - window.innerHeight
        progress = total > 0 ? window.scrollY / total : 0
      }

      panels.forEach(({ id, start, end }) => {
        const panel = document.getElementById(id) || document.getElementById(id.toLowerCase())
        if (!panel) return

        const inRange = progress >= start && progress < end
        const mid = (start + end) / 2
        const dist = Math.abs(progress - mid) / ((end - start) / 2)
        const opacity = Math.max(0, 1 - dist * 1.4)
        // 2.5: blur(6px) -> blur(0) and translateY(16px) -> translateY(0)
        const blurAmount = inRange ? (1 - Math.min(1, opacity)) * 6 : 6
        const translateY = inRange ? (1 - Math.min(1, opacity)) * 16 : 16

        panel.style.opacity = String(inRange ? opacity : 0)
        panel.style.pointerEvents = inRange && opacity > 0.3 ? 'auto' : 'none'
        panel.style.filter = `blur(${blurAmount.toFixed(1)}px)`
        panel.style.transform = `translateY(${translateY.toFixed(1)}px)`
        panel.style.transition = 'opacity 0.6s ease, transform 0.6s ease, filter 0.6s ease'
      })
    }

    tryFind()
    window.addEventListener('scroll', onScroll, { passive: true })

    return () => {
      if (scrollEl) scrollEl.removeEventListener('scroll', onScroll)
      window.removeEventListener('scroll', onScroll)
    }
  }, [])

  return null
}
