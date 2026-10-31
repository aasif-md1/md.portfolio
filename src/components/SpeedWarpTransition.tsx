import { useEffect, useRef, useState } from 'react'

interface SpeedWarpTransitionProps {
  active: boolean
  destination: 'kage' | 'torii'
  onMidpoint?: () => void
  onComplete?: () => void
}

type TransitionPhase = 'idle' | 'sprint' | 'tilting' | 'exoskeleton' | 'dissolve' | 'reveal' | 'return-fade-in' | 'return-hold' | 'return-fade-out'

export default function SpeedWarpTransition({
  active,
  destination,
  onMidpoint,
  onComplete,
}: SpeedWarpTransitionProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const [phase, setPhase] = useState<TransitionPhase>('idle')
  const currentPhaseRef = useRef<TransitionPhase>('idle')
  const animationRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const midpointTriggered = useRef<boolean>(false)
  const onMidpointRef = useRef(onMidpoint)
  const onCompleteRef = useRef(onComplete)

  useEffect(() => {
    onMidpointRef.current = onMidpoint
    onCompleteRef.current = onComplete
  }, [onMidpoint, onComplete])

  useEffect(() => {
    if (!active) {
      currentPhaseRef.current = 'idle'
      setPhase('idle')
      midpointTriggered.current = false
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
        animationRef.current = null
      }
      return
    }

    midpointTriggered.current = false

    // ── Clean, Smooth Normal Dissolve Return to Torii Shrine Walk ───────
    if (destination === 'torii') {
      currentPhaseRef.current = 'return-fade-in'
      setPhase('return-fade-in')

      // Screen reaches full black; safely swap scenes behind the pure dark veil
      const midTimer = setTimeout(() => {
        if (onMidpointRef.current) onMidpointRef.current()
        currentPhaseRef.current = 'return-hold'
        setPhase('return-hold')

        // Start smooth fade-out to reveal daylight Torii Walk
        const revealTimer = setTimeout(() => {
          currentPhaseRef.current = 'return-fade-out'
          setPhase('return-fade-out')

          const endTimer = setTimeout(() => {
            currentPhaseRef.current = 'idle'
            setPhase('idle')
            if (onCompleteRef.current) onCompleteRef.current()
          }, 400)

          return () => clearTimeout(endTimer)
        }, 80)

        return () => clearTimeout(revealTimer)
      }, 350)

      return () => clearTimeout(midTimer)
    }

    // ── Fast Choreographed Transition to Kage (Sprint -> Tilt -> Exoskeleton -> Reveal) ──
    currentPhaseRef.current = 'sprint'
    setPhase('sprint')
    startTimeRef.current = performance.now()

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const resizeCanvas = () => {
      canvas.width = window.innerWidth
      canvas.height = window.innerHeight
    }
    resizeCanvas()
    window.addEventListener('resize', resizeCanvas)

    // Generate Anime Speed Particles
    const PARTICLE_COUNT = 80
    const particles: Array<{
      angle: number
      dist: number
      speed: number
      length: number
      width: number
      color: string
    }> = []

    const colors = ['#ffffff', '#ffffff', '#ffd2cb', '#e0231c', '#ff5a3c']

    for (let i = 0; i < PARTICLE_COUNT; i++) {
      particles.push({
        angle: Math.random() * Math.PI * 2,
        dist: Math.random() * 0.8,
        speed: 2.5 + Math.random() * 4.0,
        length: 30 + Math.random() * 90,
        width: 1.5 + Math.random() * 3.5,
        color: colors[Math.floor(Math.random() * colors.length)],
      })
    }

    const LINE_COUNT = 45

    const loop = (now: number) => {
      const elapsed = (now - startTimeRef.current) / 1000

      ctx.clearRect(0, 0, canvas.width, canvas.height)

      const cx = canvas.width * 0.5
      const cy = canvas.height * 0.44
      const maxRadius = Math.hypot(canvas.width, canvas.height) * 0.75

      // Fast sprint lines during 0.0s to 0.55s
      let sprintIntensity = 0
      if (elapsed < 0.45) {
        sprintIntensity = Math.min(1, Math.pow(elapsed / 0.35, 1.4))
      } else if (elapsed < 0.60) {
        sprintIntensity = Math.max(0, 1 - (elapsed - 0.45) / 0.15)
      } else {
        sprintIntensity = 0
      }

      if (sprintIntensity > 0.01) {
        // 1. Radial Anime Speed Lines
        ctx.save()
        for (let i = 0; i < LINE_COUNT; i++) {
          if (Math.random() > 0.4 + sprintIntensity * 0.4) continue

          const baseAngle = (i / LINE_COUNT) * Math.PI * 2 + (Math.random() - 0.5) * 0.05
          const innerRadius = (110 - sprintIntensity * 80) + Math.random() * 50
          const outerRadius = maxRadius * (0.6 + Math.random() * 0.4)

          const startX = cx + Math.cos(baseAngle) * innerRadius
          const startY = cy + Math.sin(baseAngle) * innerRadius
          const endX = cx + Math.cos(baseAngle) * outerRadius
          const endY = cy + Math.sin(baseAngle) * outerRadius

          ctx.beginPath()
          ctx.moveTo(startX, startY)
          ctx.lineTo(endX, endY)
          ctx.lineWidth = (1 + Math.random() * 4) * (0.8 + sprintIntensity * 1.5)
          ctx.strokeStyle = Math.random() > 0.25
            ? `rgba(255, 255, 255, ${0.45 + sprintIntensity * 0.55})`
            : `rgba(224, 35, 28, ${0.5 + sprintIntensity * 0.5})`
          ctx.lineCap = 'round'
          ctx.stroke()
        }
        ctx.restore()

        // 2. Zooming Streak Particles
        ctx.save()
        for (const p of particles) {
          p.dist += p.speed * (0.02 + sprintIntensity * 0.06)
          if (p.dist > 1.1) {
            p.dist = 0.05 + Math.random() * 0.15
            p.angle = Math.random() * Math.PI * 2
          }

          const currentR = p.dist * maxRadius
          const px = cx + Math.cos(p.angle) * currentR
          const py = cy + Math.sin(p.angle) * currentR

          const tailR = Math.max(0, currentR - p.length * (0.5 + sprintIntensity * 2.0))
          const tx = cx + Math.cos(p.angle) * tailR
          const ty = cy + Math.sin(p.angle) * tailR

          const grad = ctx.createLinearGradient(tx, ty, px, py)
          grad.addColorStop(0, 'rgba(255,255,255,0)')
          grad.addColorStop(1, p.color)

          ctx.beginPath()
          ctx.moveTo(tx, ty)
          ctx.lineTo(px, py)
          ctx.lineWidth = p.width * (0.8 + sprintIntensity * 1.2)
          ctx.strokeStyle = grad
          ctx.lineCap = 'round'
          ctx.stroke()
        }
        ctx.restore()
      }

      // ── Choreographed Phase Sequence ──────────────────────────────────
      if (elapsed >= 0.55 && elapsed < 1.05 && currentPhaseRef.current !== 'tilting') {
        currentPhaseRef.current = 'tilting'
        setPhase('tilting')
      } else if (elapsed >= 1.05 && elapsed < 1.55 && currentPhaseRef.current !== 'exoskeleton') {
        currentPhaseRef.current = 'exoskeleton'
        setPhase('exoskeleton')
      } else if (elapsed >= 1.55 && elapsed < 1.70 && currentPhaseRef.current !== 'dissolve') {
        currentPhaseRef.current = 'dissolve'
        setPhase('dissolve')
      } else if (elapsed >= 1.70 && !midpointTriggered.current) {
        midpointTriggered.current = true
        currentPhaseRef.current = 'reveal'
        setPhase('reveal')
        if (onMidpointRef.current) onMidpointRef.current()
      }

      if (elapsed < 1.95) {
        animationRef.current = requestAnimationFrame(loop)
      } else {
        // Guaranteed midpoint trigger safeguard in case of frame drop
        if (!midpointTriggered.current) {
          midpointTriggered.current = true
          if (onMidpointRef.current) onMidpointRef.current()
        }
        currentPhaseRef.current = 'idle'
        setPhase('idle')
        if (onCompleteRef.current) onCompleteRef.current()
      }
    }

    animationRef.current = requestAnimationFrame(loop)

    // Backup wall-clock timers to guarantee midpoint and completion even if rAF stalls
    const midSafetyTimer = setTimeout(() => {
      if (!midpointTriggered.current) {
        midpointTriggered.current = true
        currentPhaseRef.current = 'reveal'
        setPhase('reveal')
        if (onMidpointRef.current) onMidpointRef.current()
      }
    }, 1750)

    const completeSafetyTimer = setTimeout(() => {
      currentPhaseRef.current = 'idle'
      setPhase('idle')
      if (onCompleteRef.current) onCompleteRef.current()
    }, 2000)

    return () => {
      window.removeEventListener('resize', resizeCanvas)
      if (animationRef.current) cancelAnimationFrame(animationRef.current)
      clearTimeout(midSafetyTimer)
      clearTimeout(completeSafetyTimer)
    }
  }, [active, destination])

  if (!active && phase === 'idle') return null

  const isReturn = destination === 'torii'
  const isReturnOpaque = isReturn && (phase === 'return-fade-in' || phase === 'return-hold')

  return (
    <div
      className="fixed inset-0 z-[120] pointer-events-none select-none overflow-hidden"
      aria-hidden="true"
    >
      {/* 1. Fast Sprint 2D Canvas (Active during 0s - 0.55s forward to Kage) */}
      <canvas
        ref={canvasRef}
        className={`w-full h-full block transition-opacity duration-200 ${
          phase === 'sprint' ? 'opacity-100' : 'opacity-0'
        }`}
      />

      {/* Central Supersonic Wind Tunnel Glow */}
      <div
        className={`absolute inset-0 flex items-center justify-center transition-opacity duration-200 ${
          phase === 'sprint' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="w-48 h-48 sm:w-72 sm:h-72 rounded-full animate-ping pointer-events-none opacity-40"
          style={{
            background: 'radial-gradient(circle, rgba(224,35,28,0.7) 0%, rgba(255,255,255,0.4) 40%, transparent 70%)',
            animationDuration: '0.35s',
          }}
        />
      </div>

      {/* 2. White Exoskeleton Blueprint Scanlines & Telemetry HUD */}
      <div
        className={`absolute inset-0 transition-opacity duration-300 ease-out ${
          phase === 'exoskeleton' ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              'linear-gradient(rgba(255,255,255,0) 50%, rgba(255,255,255,0.05) 50%), linear-gradient(90deg, rgba(255,255,255,0.02), transparent, rgba(255,255,255,0.02))',
            backgroundSize: '100% 4px, 8px 100%',
          }}
        />

        <div
          className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white to-transparent opacity-90"
          style={{
            boxShadow: '0 0 18px rgba(255,255,255,0.9), 0 0 35px rgba(255,255,255,0.6)',
            animation: 'scanSweep 0.75s ease-in-out infinite',
          }}
        />

        <div className="absolute top-7 left-7 font-mono text-[11px] text-white/80 tracking-[0.25em] flex flex-col gap-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          <div className="flex items-center gap-2.5">
            <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            <span className="font-bold text-white uppercase tracking-widest">EXOSKELETON SCHEMATIC</span>
          </div>
          <span className="text-white/50 text-[10px]">SYSTEM: 3D WIREFRAME PROTOCOL // 01</span>
          <span className="text-white/40 text-[9px]">SYNCHRONIZING TORII SANCTUM...</span>
        </div>

        <div className="absolute bottom-7 right-7 font-mono text-[11px] text-white/80 tracking-[0.25em] text-right flex flex-col gap-1.5 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)]">
          <span className="text-white font-semibold tracking-wider">100% SYNCHRONIZED</span>
          <span className="text-white/50 text-[10px]">ENTERING NIGHT SANCTUARY →</span>
        </div>
      </div>

      {/* 3. Forward to Kage Dissolve Curtain */}
      {!isReturn && (
        <div
          className={`fixed inset-0 z-30 pointer-events-none transition-opacity duration-300 ease-in-out bg-[#05070a] ${
            phase === 'dissolve' ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}

      {/* 4. Returning to Torii: Clean, pure, smooth black dissolve curtain (No text or badges) */}
      {isReturn && (
        <div
          className={`fixed inset-0 z-40 pointer-events-none transition-opacity duration-400 ease-in-out bg-[#05070a] ${
            isReturnOpaque ? 'opacity-100' : 'opacity-0'
          }`}
        />
      )}
    </div>
  )
}
