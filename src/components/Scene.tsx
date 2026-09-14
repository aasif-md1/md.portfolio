import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { Text } from '@react-three/drei'
import * as THREE from 'three'
import ToriiGate from './ToriiGate'
import LowPolyTree from './LowPolyTree'
import Ground from './Ground'
import FootstepDust, { type FootstepDustHandle } from './FootstepDust'

import { scrollToTop } from '../utils/lenis'
import { useReducedMotion } from '../hooks/useReducedMotion'

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

const GATE_COUNT = 24
const SPACING    = 7.5

export type GyroStatus = 'idle' | 'granted' | 'denied' | 'unsupported'

interface SceneProps {
  act: 1 | 2
  isWarping: boolean
  warpPhase?: 'idle' | 'wireframe' | 'zoomout' | 'zoomin'
  onGyroStatusChange?: (status: GyroStatus) => void
}

export default function Scene({ act, isWarping, warpPhase = 'idle', onGyroStatusChange }: SceneProps) {
  const groupRef    = useRef<THREE.Group>(null)
  const heroTextRef = useRef<THREE.Group>(null)
  const saturnRef   = useRef<THREE.Group>(null)
  const starsRef    = useRef<THREE.Points>(null)
  const dustRef     = useRef<FootstepDustHandle>(null)
  const { camera, scene } = useThree()
  const reducedMotion = useReducedMotion()

  // Scroll tracking & walking velocity
  const scrollTarget    = useRef(0)
  const currentScroll   = useRef(0)
  const prevScrollVal   = useRef(0)
  const scrollVelocity  = useRef(0)
  const lastBobVal      = useRef(0)
  const wasBobRising    = useRef(false)
  const stepCount       = useRef(0)

  // ── Precision Planet Hover & 3D Movement State ────────────────────────────
  const mouseNDC        = useRef({ x: 0, y: 0 })
  const mouseDelta      = useRef({ dx: 0, dy: 0 })
  const lastMousePos    = useRef({ x: 0, y: 0 })
  const angularVelocity = useRef({ x: 0, y: 0 })
  const cumulativeRot   = useRef({ x: 0, y: 0 })

  // ── Stabilized Mobile Gyroscope & Touch-Drag Fallback State ────────────────
  const gyroTarget      = useRef({ x: 0, y: 0 })
  const gyroSmoothed    = useRef({ x: 0, y: 0 })
  const baseOrientation = useRef<{ gamma: number; beta: number } | null>(null)
  const calibCount      = useRef(0)
  const calibSum        = useRef({ gamma: 0, beta: 0 })
  const gyroActive      = useRef(false)
  const touchDrag       = useRef({ x: 0, y: 0 })
  const lastTouchPos    = useRef({ x: 0, y: 0 })

  useEffect(() => {
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight
      if (totalScroll <= 0) return
      scrollTarget.current = THREE.MathUtils.clamp(window.scrollY / totalScroll, 0, 1)
    }

    const handleMouseMove = (e: MouseEvent) => {
      const curX = (e.clientX / window.innerWidth) * 2 - 1
      const curY = -(e.clientY / window.innerHeight) * 2 + 1
      
      const dx = curX - lastMousePos.current.x
      const dy = curY - lastMousePos.current.y
      lastMousePos.current.x = curX
      lastMousePos.current.y = curY

      mouseNDC.current.x = curX
      mouseNDC.current.y = curY
      mouseDelta.current.dx = dx
      mouseDelta.current.dy = dy
    }

    // Touch-drag fallback for mobile devices when gyro is denied or unsupported
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        lastTouchPos.current.x = e.touches[0].clientX
        lastTouchPos.current.y = e.touches[0].clientY
      }
    }

    const handleTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const dx = (e.touches[0].clientX - lastTouchPos.current.x) / window.innerWidth
        const dy = (e.touches[0].clientY - lastTouchPos.current.y) / window.innerHeight
        lastTouchPos.current.x = e.touches[0].clientX
        lastTouchPos.current.y = e.touches[0].clientY

        // Incrementally drag view smoothly
        touchDrag.current.x = THREE.MathUtils.clamp(touchDrag.current.x + dx * 2.0, -1, 1)
        touchDrag.current.y = THREE.MathUtils.clamp(touchDrag.current.y - dy * 2.0, -1, 1)
      }
    }

    // ── Mobile Gyroscope / DeviceOrientation Tilt Support (BGMI Physics) ──
    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return
      
      if (!gyroActive.current) {
        gyroActive.current = true
        onGyroStatusChange?.('granted')
      }

      // Auto-calibrate average baseline over first 6 samples for rock-solid stability
      if (calibCount.current < 6) {
        calibSum.current.gamma += e.gamma
        calibSum.current.beta += e.beta
        calibCount.current++
        baseOrientation.current = {
          gamma: calibSum.current.gamma / calibCount.current,
          beta: calibSum.current.beta / calibCount.current,
        }
        return
      }

      if (!baseOrientation.current) return

      // Very slow natural drift compensation (alpha = 0.002) so posture changes smoothly recenter
      baseOrientation.current.gamma += (e.gamma - baseOrientation.current.gamma) * 0.002
      baseOrientation.current.beta += (e.beta - baseOrientation.current.beta) * 0.002

      // Pure delta relative to resting posture
      const deltaGamma = e.gamma - baseOrientation.current.gamma
      const deltaBeta = e.beta - baseOrientation.current.beta

      // Light 0.4° micro-deadzone eliminates hardware sensor jitter
      const rawX = Math.abs(deltaGamma) < 0.4 ? 0 : deltaGamma
      const rawY = Math.abs(deltaBeta) < 0.4 ? 0 : deltaBeta

      // Proportional linear response (-1 to 1) over comfortable 22° wrist range
      const normX = Math.min(Math.max(rawX / 22, -1), 1)
      const normY = Math.min(Math.max(-rawY / 22, -1), 1)

      gyroTarget.current.x = normX
      gyroTarget.current.y = normY
    }

    // Attach gyroscope listeners (with iOS permission request fallback if required)
    if (typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      if (typeof (window as any).DeviceOrientationEvent?.requestPermission === 'function') {
        const askGyroPermission = () => {
          (window as any).DeviceOrientationEvent.requestPermission()
            .then((res: string) => {
              if (res === 'granted') {
                gyroActive.current = true
                onGyroStatusChange?.('granted')
                window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true })
              } else {
                gyroActive.current = false
                onGyroStatusChange?.('denied')
              }
            })
            .catch(() => {
              gyroActive.current = false
              onGyroStatusChange?.('denied')
            })
        }
        window.addEventListener('touchstart', askGyroPermission, { once: true })
        window.addEventListener('click', askGyroPermission, { once: true })
      } else {
        window.addEventListener('deviceorientation', handleDeviceOrientation, { passive: true })
        if (isTouchDevice) {
          setTimeout(() => {
            if (!gyroActive.current) {
              onGyroStatusChange?.('unsupported')
            }
          }, 1500)
        }
      }
    } else if (isTouchDevice) {
      onGyroStatusChange?.('unsupported')
    }

    if (isTouchDevice) {
      window.addEventListener('touchstart', handleTouchStart, { passive: true })
      window.addEventListener('touchmove', handleTouchMove, { passive: true })
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    handleScroll()

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('deviceorientation', handleDeviceOrientation)
      if (isTouchDevice) {
        window.removeEventListener('touchstart', handleTouchStart)
        window.removeEventListener('touchmove', handleTouchMove)
      }
    }
  }, [onGyroStatusChange])

  // Trees for Act 1
  const elements = useMemo(() =>
    Array.from({ length: GATE_COUNT }, (_, i) => ({
      z: -i * SPACING,
      leftTree: {
        x: -(4.6 + seededRand(i * 3) * 2.2),
        scale: 1.05 + seededRand(i * 3 + 1) * 0.4,
        variant: (i % 2 === 0 ? 'sakura' : 'white') as 'sakura' | 'white',
        show: seededRand(i * 3 + 2) > 0.1,
      },
      rightTree: {
        x: 4.6 + seededRand(i * 5) * 2.2,
        scale: 1.0 + seededRand(i * 5 + 1) * 0.4,
        variant: (i % 3 === 0 ? 'white' : 'sakura') as 'sakura' | 'white',
        show: seededRand(i * 5 + 2) > 0.12,
      },
    }))
  , [])

  // ── Crisp Celestial Star Sprite ──────────────────────────────────────────
  const starTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width  = 64
    canvas.height = 64
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32)
    g.addColorStop(0,    'rgba(255, 255, 255, 1)')
    g.addColorStop(0.2,  'rgba(235, 245, 255, 0.85)')
    g.addColorStop(0.5,  'rgba(170, 200, 245, 0.4)')
    g.addColorStop(0.8,  'rgba(120, 160, 220, 0.1)')
    g.addColorStop(1,    'rgba(0, 0, 0, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 64, 64)
    return new THREE.CanvasTexture(canvas)
  }, [])

  // ── 4,000 Balanced Celestial Starfield (Endless 360° Loop) ────────────────
  const starGeo = useMemo(() => {
    const count = 4000
    const positions = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2
      const phi   = Math.acos(2 * Math.random() - 1)
      const r     = 35 + Math.random() * 145   // layered depth from 35 to 180 units
      positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
      positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
      positions[i * 3 + 2] = r * Math.cos(phi)
    }
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [])

  const hasReachedEnd = useRef(false)

  // When switching from Galaxy Act (Act 2) back to Shrine Act (Act 1), reset completely to the starting hero view
  useEffect(() => {
    if (act === 1) {
      hasReachedEnd.current = false
      scrollTarget.current = 0
      currentScroll.current = 0
      prevScrollVal.current = 0
      scrollVelocity.current = 0
      lastBobVal.current = 0
      wasBobRising.current = false
      stepCount.current = 0
      scrollToTop(true)

      // Reset all Torii gates to their original starting positions & transforms
      if (groupRef.current) {
        groupRef.current.position.z = 0
        const children = groupRef.current.children
        for (let i = 0; i < children.length; i++) {
          children[i].position.z = -i * SPACING
          const torii = children[i].children[1] as THREE.Group | undefined
          if (torii) {
            torii.scale.set(1, 1, 1)
            torii.rotation.set(0, 0, 0)
          }
        }
      }
    }
  }, [act])

  // ── Wireframe effect (transition) ──────────────────────────────────────────
  useEffect(() => {
    const isWireframe = warpPhase === 'wireframe' || warpPhase === 'zoomout'
    scene.traverse((obj) => {
      const mesh = obj as THREE.Mesh
      if (!mesh.isMesh || !mesh.material) return
      const apply = (mat: THREE.Material) => {
        // @ts-ignore
        mat.wireframe = isWireframe
        if (mat instanceof THREE.MeshStandardMaterial ||
            mat instanceof THREE.MeshPhongMaterial    ||
            mat instanceof THREE.MeshBasicMaterial) {
          if (isWireframe) {
            // @ts-ignore
            if (!mat._origColor) mat._origColor = mat.color.clone()
            mat.color.set('#ffffff')
          } else {
            // @ts-ignore
            if (mat._origColor) { mat.color.copy(mat._origColor); delete mat._origColor }
          }
        }
        mat.needsUpdate = true
      }
      Array.isArray(mesh.material) ? mesh.material.forEach(apply) : apply(mesh.material)
    })
  }, [warpPhase, scene, act])

  // Force black bg during wireframe/zoomout
  useEffect(() => {
    if (warpPhase === 'wireframe' || warpPhase === 'zoomout') {
      scene.background = new THREE.Color('#000000')
      scene.fog = null
    }
  }, [warpPhase, scene, act])

  // Temp vectors for screen-space proximity
  const saturnWorldPos = useMemo(() => new THREE.Vector3(), [])
  const saturnNDC      = useMemo(() => new THREE.Vector3(), [])

  // ── Main Render Loop ───────────────────────────────────────────────────────
  useFrame((state, delta) => {
    if (act === 1) {
      // Damped target progression with a strict maximum speed cap (buttery smooth like konstantinfo.com)
      const damped = THREE.MathUtils.damp(currentScroll.current, scrollTarget.current, 0.8, delta)
      // Asymmetric walk speed: scroll down is slow & cinematic, scroll up is faster for quick return
      const stepDiff = damped - currentScroll.current
      const maxWalkSpeed = stepDiff < 0 ? 0.30 : 0.17
      const maxStep = maxWalkSpeed * delta
      currentScroll.current += THREE.MathUtils.clamp(stepDiff, -maxStep, maxStep)
    } else {
      currentScroll.current = THREE.MathUtils.damp(currentScroll.current, scrollTarget.current, 3.0, delta)
    }
    if (scrollTarget.current > 0.95) hasReachedEnd.current = true

    const pCam = camera as THREE.PerspectiveCamera

    // ── Warp Phases ──
    if (reducedMotion) {
      if (warpPhase !== 'idle') {
        pCam.position.set(0, 2.4, 7)
        pCam.lookAt(0, 0, 0)
        pCam.fov = 46
        pCam.updateProjectionMatrix()
        return
      }
    } else {
      if (warpPhase === 'wireframe') {
        pCam.position.y = THREE.MathUtils.damp(pCam.position.y, 12,  3.0, delta)
        pCam.position.z = THREE.MathUtils.damp(pCam.position.z, 22,  3.0, delta)
        pCam.position.x = THREE.MathUtils.damp(pCam.position.x,  0,  6.0, delta)
        pCam.lookAt(0, 0, 0)
        pCam.fov = THREE.MathUtils.damp(pCam.fov, 55, 3.0, delta)
        pCam.updateProjectionMatrix()
        return
      }
      if (warpPhase === 'zoomout') {
        pCam.position.y = THREE.MathUtils.damp(pCam.position.y, 35,  5.0, delta)
        pCam.position.z = THREE.MathUtils.damp(pCam.position.z, 65,  5.0, delta)
        pCam.lookAt(0, 0, 0)
        pCam.fov = THREE.MathUtils.damp(pCam.fov, 38, 4.0, delta)
        pCam.updateProjectionMatrix()
        return
      }
      if (warpPhase === 'zoomin') {
        pCam.position.y = THREE.MathUtils.damp(pCam.position.y, 2.4, 4.0, delta)
        pCam.position.z = THREE.MathUtils.damp(pCam.position.z,   7, 4.0, delta)
        pCam.position.x = THREE.MathUtils.damp(pCam.position.x,   0, 4.0, delta)
        pCam.fov = THREE.MathUtils.damp(pCam.fov, 46, 4.0, delta)
        pCam.updateProjectionMatrix()
      }
    }

    // Detect touch / mobile device
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

    // Smoothly interpolate calibrated mobile gyroscope tilt (crisp & immediate damping like BGMI)
    gyroSmoothed.current.x = THREE.MathUtils.damp(gyroSmoothed.current.x, gyroTarget.current.x, 5.5, delta)
    gyroSmoothed.current.y = THREE.MathUtils.damp(gyroSmoothed.current.y, gyroTarget.current.y, 5.5, delta)

    // On mobile touch devices: if gyro is active use gyro, else fallback to touchDrag
    const effectiveMobileX = gyroActive.current ? gyroSmoothed.current.x : touchDrag.current.x
    const effectiveMobileY = gyroActive.current ? gyroSmoothed.current.y : touchDrag.current.y

    const curMx = isTouchDevice ? effectiveMobileX : mouseNDC.current.x
    const curMy = isTouchDevice ? effectiveMobileY : mouseNDC.current.y
    const parallaxScale = reducedMotion ? 0.2 : 1.0

    // ── Velocity calculation (per-frame rate of change) ──
    const rawVel = Math.abs(currentScroll.current - prevScrollVal.current) / Math.max(delta, 0.001)
    prevScrollVal.current = currentScroll.current
    scrollVelocity.current = THREE.MathUtils.damp(scrollVelocity.current, rawVel, 8.0, delta)
    const velocityFactor = THREE.MathUtils.clamp(scrollVelocity.current * 3.5, 0, 1)

    // ── ACT 1 ──
    if (act === 1) {
      const totalTravel = GATE_COUNT * SPACING * 0.88
      const forwardZ    = currentScroll.current * totalTravel

      // ── 2.1: Footstep Bob Rhythm (Weight & Rhythm) ──
      const walkCycleSpeed = 3.8
      const walkCyclePhase = currentScroll.current * totalTravel * walkCycleSpeed
      const rawStepBob = Math.abs(Math.sin(walkCyclePhase))
      const stepBobY   = rawStepBob * 0.045 * velocityFactor
      const stepBobRoll = Math.sin(walkCyclePhase * 0.5) * 0.008 * velocityFactor

      // ── 2.3: Footstep Dust Burst on Bob Peak (Rising -> Falling) ──
      const isBobRising = rawStepBob > lastBobVal.current
      if (wasBobRising.current && !isBobRising && lastBobVal.current > 0.8 && velocityFactor > 0.05) {
        stepCount.current++
        const footSide = (stepCount.current % 2 === 0 ? 1 : -1) as -1 | 1
        dustRef.current?.burst(footSide, pCam.position.z)
      }
      wasBobRising.current = isBobRising
      lastBobVal.current = rawStepBob

      // ── 2.2: Per-gate Proximity Choreography & Infinite Wrap ──
      if (groupRef.current) {
        groupRef.current.position.z = forwardZ
        const children = groupRef.current.children
        for (let i = 0; i < children.length; i++) {
          const child = children[i]
          const worldZ = child.position.z + forwardZ
          if (worldZ > 14) child.position.z -= GATE_COUNT * SPACING

          // Proximity reaction within ~6 units
          const dist = Math.abs(worldZ - pCam.position.z)
          const proximity = 1 - THREE.MathUtils.clamp(dist / 6.0, 0, 1)
          const targetScale = 0.96 + proximity * 0.04
          const targetRotY = (1 - proximity) * (i % 2 === 0 ? 0.025 : -0.025)
          const targetRotX = (1 - proximity) * 0.02

          // ToriiGate is child index 1
          const torii = child.children[1] as THREE.Group | undefined
          if (torii) {
            torii.scale.x = THREE.MathUtils.damp(torii.scale.x, targetScale, 6.0, delta)
            torii.scale.y = THREE.MathUtils.damp(torii.scale.y, targetScale, 6.0, delta)
            torii.scale.z = THREE.MathUtils.damp(torii.scale.z, targetScale, 6.0, delta)
            torii.rotation.y = THREE.MathUtils.damp(torii.rotation.y, targetRotY, 6.0, delta)
            torii.rotation.x = THREE.MathUtils.damp(torii.rotation.x, targetRotX, 6.0, delta)
          }
        }
      }

      // Camera with walking bob & roll layered on
      pCam.position.x = THREE.MathUtils.damp(pCam.position.x, 0,   3.5, delta)
      pCam.position.y = THREE.MathUtils.damp(pCam.position.y, 2.3 + stepBobY, 6.0, delta)
      pCam.rotation.x = THREE.MathUtils.damp(pCam.rotation.x,  curMy * 0.25 * parallaxScale, 4.5, delta)
      pCam.rotation.y = THREE.MathUtils.damp(pCam.rotation.y, -curMx * 0.35 * parallaxScale, 4.5, delta)
      pCam.rotation.z = THREE.MathUtils.damp(pCam.rotation.z, -curMx * 0.05 * parallaxScale + stepBobRoll, 4.5, delta)

      // ── 2.4: Fog pulse on fast scroll ──
      if (scene.fog instanceof THREE.Fog) {
        const targetNear = THREE.MathUtils.lerp(16, 9, velocityFactor)
        const targetFar  = THREE.MathUtils.lerp(80, 48, velocityFactor)
        scene.fog.near = THREE.MathUtils.damp(scene.fog.near, targetNear, 4.0, delta)
        scene.fog.far  = THREE.MathUtils.damp(scene.fog.far, targetFar, 4.0, delta)
      }

      if (heroTextRef.current) {
        heroTextRef.current.position.y = 0.5 + Math.sin(state.clock.elapsedTime * 0.5) * 0.08
        let textOpacity = 0
        if (hasReachedEnd.current && currentScroll.current < 0.5)
          textOpacity = Math.min(1, (0.5 - currentScroll.current) * 2.5)
        heroTextRef.current.visible = textOpacity > 0.005
        if (heroTextRef.current.visible) {
          heroTextRef.current.traverse((child) => {
            const mesh = child as any
            if (mesh.isMesh && mesh.material) {
              mesh.material.opacity = textOpacity
              mesh.material.transparent = true
            }
          })
        }
      }

    } else {
      // ── ACT 2 ──

      // 1. Stars: continuous smooth left-to-right orbit (full 360° sphere, never disappears)
      if (starsRef.current) {
        starsRef.current.rotation.y += delta * 0.12
      }

      // 2. Strict On-Planet Interaction Only
      if (saturnRef.current) {
        saturnRef.current.getWorldPosition(saturnWorldPos)
        saturnNDC.copy(saturnWorldPos).project(pCam)

        const aspect = window.innerWidth / Math.max(window.innerHeight, 1)
        const relX = (mouseNDC.current.x - saturnNDC.x) * aspect
        const relY = (mouseNDC.current.y - saturnNDC.y)
        const dist = Math.hypot(relX, relY)

        // ONLY active when the cursor is directly on/over the planet (screen radius ~0.55)
        const isOverPlanet = dist < 0.55

        if (isOverPlanet) {
          // Cursor is directly over the planet: respond to mouse velocity & direction
          angularVelocity.current.x += -mouseDelta.current.dy * 4.5
          angularVelocity.current.y += mouseDelta.current.dx * 5.0
        }
        // Always reset per-frame delta
        mouseDelta.current.dx = 0
        mouseDelta.current.dy = 0

        // Friction damping on angular velocity
        const friction = Math.pow(0.86, delta * 60)
        angularVelocity.current.x *= friction
        angularVelocity.current.y *= friction

        // Accumulate rotation from velocity + smooth idle cosmic spin (0.22)
        cumulativeRot.current.y += (angularVelocity.current.y + 0.22) * delta
        cumulativeRot.current.x += angularVelocity.current.x * delta

        // Tilt towards cursor ONLY when cursor is over the planet; otherwise stay in calm neutral orientation
        const targetTiltX = isOverPlanet ? (0.25 - relY * 0.6) : 0.25
        const targetTiltZ = isOverPlanet ? (-0.15 - relX * 0.5) : -0.15

        // Smoothly blend rotational states
        saturnRef.current.rotation.x = THREE.MathUtils.damp(
          saturnRef.current.rotation.x,
          cumulativeRot.current.x + targetTiltX,
          isOverPlanet ? 6.0 : 3.0,
          delta
        )
        saturnRef.current.rotation.y = cumulativeRot.current.y
        saturnRef.current.rotation.z = THREE.MathUtils.damp(
          saturnRef.current.rotation.z,
          targetTiltZ,
          isOverPlanet ? 6.0 : 3.0,
          delta
        )

        // Responsive positioning based on viewport aspect ratio (mobile portrait vs desktop)
        const isPortrait = aspect < 1.05
        const targetX = isPortrait ? 0 : 6.5
        const targetYBase = isPortrait ? 2.2 : 0.2
        const targetZ = isPortrait ? -18 : -12
        const targetScale = isPortrait ? 0.6 : 1.0

        saturnRef.current.position.x = THREE.MathUtils.damp(saturnRef.current.position.x, targetX, 3.0, delta)
        saturnRef.current.position.z = THREE.MathUtils.damp(saturnRef.current.position.z, targetZ, 3.0, delta)
        saturnRef.current.scale.setScalar(THREE.MathUtils.damp(saturnRef.current.scale.x, targetScale, 3.0, delta))

        // Gentle ambient floating — stays stably anchored in view instead of scrolling off-screen
        const idleFloat = Math.sin(state.clock.elapsedTime * (reducedMotion ? 0.3 : 0.8)) * (reducedMotion ? 0.05 : 0.15)
        saturnRef.current.position.y = THREE.MathUtils.damp(
          saturnRef.current.position.y,
          targetYBase + idleFloat,
          2.0, delta
        )
      }

      // Camera parallax
      const targetX = curMx * 0.48 * parallaxScale
      const targetY = 1.8 + curMy * 0.48 * parallaxScale
      pCam.position.x = THREE.MathUtils.damp(pCam.position.x, targetX, 4.5, delta)
      pCam.position.y = THREE.MathUtils.damp(pCam.position.y, targetY, 4.5, delta)
      pCam.lookAt(0, 0, -20)
    }

    if (isWarping && warpPhase === 'idle') {
      pCam.fov = THREE.MathUtils.damp(pCam.fov, 110, 8.0, delta)
      pCam.updateProjectionMatrix()
    } else if (warpPhase === 'idle') {
      pCam.fov = THREE.MathUtils.damp(pCam.fov, 46, 4.0, delta)
      pCam.updateProjectionMatrix()
    }
  })

  return (
    <group>
      {act === 1 ? (
        <>
          {/* ================= ACT 1: SHRINE ================= */}
          <FootstepDust ref={dustRef} />
          <group ref={heroTextRef} position={[0, 0.4, -8]} visible={false}>
            <Text
              position={[0, 0, 0]}
              scale={[1, 1.2, 1]}
              font="/fonts/Movement-DirectBlack.otf"
              fontSize={5.0}
              color="#c93b2b"
              outlineWidth={0.06}
              outlineColor="#8a2318"
              anchorX="center"
              anchorY="middle"
              letterSpacing={0.2}
            >
              PORTFOL!O
            </Text>
          </group>

          <group ref={groupRef}>
            {elements.map((el, i) => (
              <group key={i} position={[0, 0, el.z]}>
                <Ground seed={i} />
                <ToriiGate />
                {el.leftTree.show && (
                  <LowPolyTree
                    position={[el.leftTree.x, 0, 0]}
                    scale={el.leftTree.scale}
                    leafColor={el.leftTree.variant === 'sakura' ? '#d48ea1' : '#f0f0f0'}
                  />
                )}
                {el.rightTree.show && (
                  <LowPolyTree
                    position={[el.rightTree.x, 0, 0]}
                    scale={el.rightTree.scale}
                    leafColor={el.rightTree.variant === 'sakura' ? '#d48ea1' : '#f0f0f0'}
                  />
                )}
              </group>
            ))}
          </group>
        </>
      ) : (
        <>
          {/* ================= ACT 2: GALAXY ================= */}

          {/* 4,000 Crisp Celestial Stars — Balanced Brightness, Endless 360° */}
          <points ref={starsRef} geometry={starGeo}>
            <pointsMaterial
              map={starTexture}
              size={1.25}
              sizeAttenuation
              transparent
              opacity={0.85}
              color="#eef4ff"
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </points>

          {/* Planet — positioned on the right ([6.5, 0.2, -12]), rich shading & metallic ring */}
          <group
            ref={saturnRef}
            position={[6.5, 0.2, -12]}
            rotation={[0.25, 0, -0.15]}
          >
            {/* Low-Poly Dodecahedron Planet with crisp faceted shading */}
            <mesh castShadow receiveShadow>
              <dodecahedronGeometry args={[3.5, 2]} />
              <meshStandardMaterial
                color="#c93b2b"
                roughness={0.5}
                metalness={0.2}
                flatShading
              />
            </mesh>

            {/* Main Luminous Orbit Ring with metallic luster */}
            <mesh castShadow receiveShadow rotation={[Math.PI / 2.3, 0, 0]}>
              <ringGeometry args={[4.8, 6.8, 64]} />
              <meshStandardMaterial
                color="#f0ede6"
                roughness={0.3}
                metalness={0.4}
                side={THREE.DoubleSide}
                transparent
                opacity={0.85}
              />
            </mesh>
          </group>
        </>
      )}

      {/* ── Full-screen wireframe grid fill — Shrine→Galaxy transition only ── */}
      {(warpPhase === 'wireframe' || warpPhase === 'zoomout') && act === 1 && (
        <>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, -400]}>
            <planeGeometry args={[2000, 2000, 80, 80]} />
            <meshBasicMaterial color="#ffffff" wireframe side={THREE.DoubleSide} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 60, -400]}>
            <planeGeometry args={[2000, 2000, 80, 80]} />
            <meshBasicMaterial color="#ffffff" wireframe side={THREE.DoubleSide} />
          </mesh>
        </>
      )}
    </group>
  )
}
