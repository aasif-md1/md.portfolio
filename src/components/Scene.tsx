import { useRef, useMemo, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import ToriiGate from './ToriiGate'
import LowPolyTree from './LowPolyTree'
import Ground from './Ground'
import MountFuji from './MountFuji'
import FootstepDust, { type FootstepDustHandle } from './FootstepDust'
import { useReducedMotion } from '../hooks/useReducedMotion'

function seededRand(seed: number) {
  const x = Math.sin(seed + 1) * 10000
  return x - Math.floor(x)
}

const GATE_COUNT = 14
const SPACING    = 7.0
const LOOP_LENGTH = GATE_COUNT * SPACING // 98 units period
const CURVE_FREQ = (2 * Math.PI) / LOOP_LENGTH // 2 * PI / 98
const CURVE_AMP  = 2.4 // Gentle organic S-curve amplitude in meters

// Calculates the smooth S-curve position and tangent angle at any Z position
export function getPathOffset(z: number) {
  const phase = z * CURVE_FREQ
  const x = Math.sin(phase) * CURVE_AMP
  // Derivative dx/dz for path tangent angle
  const dx = Math.cos(phase) * CURVE_AMP * CURVE_FREQ
  const rotY = Math.atan(dx)
  return { x, rotY }
}

export type GyroStatus = 'idle' | 'granted' | 'denied' | 'unsupported'

interface SceneProps {
  onGyroStatusChange?: (status: GyroStatus) => void
  isWarping?: boolean
  resetKey?: number
}

// Atmospheric valley horizon mist texture (vertical feather from dense sky fog to soft transparent)
function createHorizonMistTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 128
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const grad = ctx.createLinearGradient(0, 512, 0, 0)
  grad.addColorStop(0.0, 'rgba(238, 242, 246, 1.0)')
  grad.addColorStop(0.40, 'rgba(238, 242, 246, 0.98)')
  grad.addColorStop(0.65, 'rgba(238, 242, 246, 0.72)')
  grad.addColorStop(0.86, 'rgba(238, 242, 246, 0.20)')
  grad.addColorStop(1.0, 'rgba(238, 242, 246, 0.0)')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 128, 512)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

export default function Scene({ onGyroStatusChange, isWarping = false, resetKey = 0 }: SceneProps) {
  const groupRef    = useRef<THREE.Group>(null)
  const dustRef     = useRef<FootstepDustHandle>(null)
  const fujiRef     = useRef<THREE.Group>(null)
  const { camera, scene } = useThree()
  const reducedMotion = useReducedMotion()
  const horizonMistTex = useMemo(() => createHorizonMistTexture(), [])

  // Scroll tracking & walking velocity
  const scrollTarget    = useRef(0)
  const currentScroll   = useRef(0)
  const prevScrollVal   = useRef(0)
  const ambientAutoWalk = useRef(0) // Smooth ambient forward strolling
  const warpTimer       = useRef(0) // Choreographed warp sequence timer
  const cameraTiltUp    = useRef(0) // Smooth upward pitch during sequence
  const warpVelocity    = useRef(0)
  const scrollVelocity  = useRef(0)
  const mistMeshRef     = useRef<THREE.Mesh>(null)
  const exoWireframeMat = useMemo(
    () => new THREE.MeshBasicMaterial({ color: 0xffffff, wireframe: true }),
    []
  )
  const lastBobVal      = useRef(0)
  const wasBobRising    = useRef(false)
  const stepCount       = useRef(0)
  const hasReachedEnd   = useRef(false)

  // Cursor parallax coordinates
  const mouseNDC        = useRef({ x: 0, y: 0 })

  // Stabilized Mobile Gyroscope & Touch-Drag Fallback State
  const gyroTarget      = useRef({ x: 0, y: 0 })
  const gyroSmoothed    = useRef({ x: 0, y: 0 })
  const baseOrientation = useRef<{ gamma: number; beta: number } | null>(null)
  const calibCount      = useRef(0)
  const calibSum        = useRef({ gamma: 0, beta: 0 })
  const gyroActive      = useRef(false)
  const touchDrag       = useRef({ x: 0, y: 0 })
  const lastTouchPos    = useRef({ x: 0, y: 0 })
  // Full reset when returning to Torii Walk scene (starts walk from the very beginning at top)
  useEffect(() => {
    if (resetKey > 0) {
      scrollTarget.current = 0
      currentScroll.current = 0
      prevScrollVal.current = 0
      ambientAutoWalk.current = 0
      warpTimer.current = 0
      cameraTiltUp.current = 0
      warpVelocity.current = 0
      scrollVelocity.current = 0
      stepCount.current = 0
      hasReachedEnd.current = false
      lastBobVal.current = 0
      wasBobRising.current = false

      if (scene.overrideMaterial !== null) {
        scene.overrideMaterial = null
      }
      if (scene.background instanceof THREE.Color) {
        scene.background.set('#eef2f6')
      }
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.set('#eef2f6')
        scene.fog.near = 18
        scene.fog.far = 85
      }

      const pCam = camera as THREE.PerspectiveCamera
      if (pCam) {
        pCam.position.set(0, 2.4, 7)
        pCam.rotation.set(0, 0, 0)
        pCam.fov = 46
        pCam.updateProjectionMatrix()
      }

      if (groupRef.current) {
        groupRef.current.position.z = 0
        const children = groupRef.current.children
        for (let i = 0; i < children.length; i++) {
          const child = children[i]
          child.position.z = -i * SPACING
          const offset = getPathOffset(child.position.z)
          child.position.x = offset.x
          child.rotation.y = offset.rotY
          const torii = child.children[1] as THREE.Group | undefined
          if (torii) {
            torii.scale.set(1, 1, 1)
            torii.rotation.set(0, 0, 0)
          }
        }
      }
    }
  }, [resetKey, camera, scene])

  useEffect(() => {
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

    const handleScroll = () => {
      const totalScroll = document.documentElement.scrollHeight - window.innerHeight
      if (totalScroll <= 0) return
      scrollTarget.current = THREE.MathUtils.clamp(window.scrollY / totalScroll, 0, 1)
    }

    const handleMouseMove = (e: MouseEvent) => {
      mouseNDC.current.x = (e.clientX / window.innerWidth) * 2 - 1
      mouseNDC.current.y = -(e.clientY / window.innerHeight) * 2 + 1
    }

    // Touch-drag fallback for mobile devices
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

        touchDrag.current.x = THREE.MathUtils.clamp(touchDrag.current.x + dx * 2.2, -1.2, 1.2)
        touchDrag.current.y = THREE.MathUtils.clamp(touchDrag.current.y - dy * 2.2, -1.0, 1.0)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('mousemove', handleMouseMove, { passive: true })
    if (isTouchDevice) {
      window.addEventListener('touchstart', handleTouchStart, { passive: true })
      window.addEventListener('touchmove', handleTouchMove, { passive: true })
    }

    // Mobile DeviceOrientation (Gyroscope)
    const handleDeviceOrientation = (e: DeviceOrientationEvent) => {
      if (e.gamma === null || e.beta === null) return

      if (calibCount.current < 15) {
        calibSum.current.gamma += e.gamma
        calibSum.current.beta  += e.beta
        calibCount.current++
        if (calibCount.current === 15) {
          baseOrientation.current = {
            gamma: calibSum.current.gamma / 15,
            beta:  calibSum.current.beta  / 15,
          }
        }
        return
      }

      if (!baseOrientation.current) return

      let deltaGamma = e.gamma - baseOrientation.current.gamma
      let deltaBeta  = e.beta  - baseOrientation.current.beta

      deltaGamma = THREE.MathUtils.clamp(deltaGamma, -45, 45)
      deltaBeta  = THREE.MathUtils.clamp(deltaBeta,  -45, 45)

      const normX = deltaGamma / 45
      const normY = deltaBeta  / 45

      const deadzone = 0.025
      const applyDeadzone = (val: number) => {
        if (Math.abs(val) < deadzone) return 0
        return Math.sign(val) * ((Math.abs(val) - deadzone) / (1 - deadzone))
      }

      gyroTarget.current.x = applyDeadzone(normX) * 1.35
      gyroTarget.current.y = -applyDeadzone(normY) * 1.35
    }

    const initOrientationListener = () => {
      window.addEventListener('deviceorientation', handleDeviceOrientation, true)
      gyroActive.current = true
      onGyroStatusChange?.('granted')
    }

    if (isTouchDevice && typeof window !== 'undefined' && 'DeviceOrientationEvent' in window) {
      const DOE = window.DeviceOrientationEvent as unknown as {
        requestPermission?: () => Promise<'granted' | 'denied'>
      }

      if (typeof DOE.requestPermission === 'function') {
        const handleFirstInteraction = () => {
          DOE.requestPermission!()
            .then((res) => {
              if (res === 'granted') {
                initOrientationListener()
              } else {
                onGyroStatusChange?.('denied')
              }
            })
            .catch(() => {
              onGyroStatusChange?.('denied')
            })
        }
        window.addEventListener('touchend', handleFirstInteraction, { once: true })
      } else {
        initOrientationListener()
      }
    } else if (isTouchDevice) {
      onGyroStatusChange?.('unsupported')
    }

    return () => {
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('mousemove', handleMouseMove)
      if (isTouchDevice) {
        window.removeEventListener('touchstart', handleTouchStart)
        window.removeEventListener('touchmove', handleTouchMove)
        window.removeEventListener('deviceorientation', handleDeviceOrientation, true)
      }
    }
  }, [onGyroStatusChange])

  // Elements layout (Torii gates + multi-layered tree groves) along the gentle S-curve path
  const elements = useMemo(() =>
    Array.from({ length: GATE_COUNT }, (_, i) => {
      const z = -i * SPACING
      const { x, rotY } = getPathOffset(z)
      return {
        z,
        x,
        rotY,
        leftTree: {
          x: -5.0 - seededRand(i * 3) * 1.8,
          scale: 0.95 + seededRand(i * 3 + 1) * 0.35,
          variant: (i % 2 === 0 ? 'sakura' : 'white') as 'sakura' | 'white',
          show: seededRand(i * 3 + 2) > 0.08,
        },
        outerLeftTree: {
          x: -9.5 - seededRand(i * 7) * 3.0,
          scale: 1.1 + seededRand(i * 7 + 1) * 0.35,
          variant: (i % 3 === 0 ? 'white' : 'sakura') as 'sakura' | 'white',
          show: seededRand(i * 7 + 2) > 0.22,
        },
        rightTree: {
          x: 6.2 + seededRand(i * 5) * 2.0,
          scale: 0.92 + seededRand(i * 5 + 1) * 0.30,
          variant: (i % 3 === 0 ? 'white' : 'sakura') as 'sakura' | 'white',
          show: seededRand(i * 5 + 2) > 0.08,
        },
        outerRightTree: {
          x: 10.8 + seededRand(i * 11) * 3.2,
          scale: 1.12 + seededRand(i * 11 + 1) * 0.35,
          variant: (i % 2 === 0 ? 'sakura' : 'white') as 'sakura' | 'white',
          show: seededRand(i * 11 + 2) > 0.18,
        },
      }
    })
  , [])

  // ── Main Render Loop ───────────────────────────────────────────────────────
  useFrame((_, delta) => {
    // 1. Damped target progression:
    // Responsive progression: slightly boosts walking pace when user actively scrolls
    const dampedScroll = THREE.MathUtils.damp(currentScroll.current, scrollTarget.current, 2.4, delta)
    const scrollDiff = dampedScroll - currentScroll.current
    const maxSpeed = scrollDiff < 0 ? 0.20 : 0.15
    const maxStep = maxSpeed * delta
    currentScroll.current += THREE.MathUtils.clamp(scrollDiff, -maxStep, maxStep)

    // Destination trigger flags
    if (scrollTarget.current > 0.90) hasReachedEnd.current = true
    if (scrollTarget.current < 0.05) hasReachedEnd.current = false

    const pCam = camera as THREE.PerspectiveCamera

    // ── Choreographed Transition Sequence ──────────────────────────────────
    if (isWarping) {
      warpTimer.current += delta

      if (warpTimer.current < 0.55) {
        // Phase 1 (0s - 0.55s): High-speed road dash (~0.55s)
        warpVelocity.current = THREE.MathUtils.lerp(warpVelocity.current, 135, delta * 6.0)
        ambientAutoWalk.current += warpVelocity.current * delta

        pCam.fov = THREE.MathUtils.lerp(pCam.fov, 72, delta * 5.0)
        pCam.updateProjectionMatrix()

        if (Math.random() > 0.4) {
          stepCount.current++
          const footSide = (stepCount.current % 2 === 0 ? 1 : -1) as -1 | 1
          dustRef.current?.burst(footSide, pCam.position.z, pCam.position.x)
        }

        cameraTiltUp.current = THREE.MathUtils.lerp(cameraTiltUp.current, 0, delta * 5.0)
        scene.overrideMaterial = null
      } else if (warpTimer.current < 1.05) {
        // Phase 2 (0.55s - 1.05s): Speed decelerates smoothly, camera angle pitches upward
        warpVelocity.current = THREE.MathUtils.lerp(warpVelocity.current, 8, delta * 5.0)
        ambientAutoWalk.current += warpVelocity.current * delta

        pCam.fov = THREE.MathUtils.lerp(pCam.fov, 48, delta * 4.0)
        pCam.updateProjectionMatrix()

        // Camera angle smoothly tilts up towards Torii canopy and sky
        cameraTiltUp.current = THREE.MathUtils.lerp(cameraTiltUp.current, 0.45, delta * 4.5)

        // Background & fog darken smoothly towards deep void black
        if (scene.background instanceof THREE.Color) {
          scene.background.lerp(new THREE.Color('#05070a'), delta * 4.5)
        }
        if (scene.fog instanceof THREE.Fog) {
          scene.fog.color.lerp(new THREE.Color('#05070a'), delta * 4.5)
          scene.fog.near = THREE.MathUtils.damp(scene.fog.near, 12, 3.5, delta)
          scene.fog.far = THREE.MathUtils.damp(scene.fog.far, 120, 3.5, delta)
        }
        scene.overrideMaterial = null
      } else {
        // Phase 3 (1.05s+): White Exoskeleton Wireframe on Pitch-Black Screen
        warpVelocity.current = THREE.MathUtils.lerp(warpVelocity.current, 0, delta * 6.0)
        ambientAutoWalk.current += warpVelocity.current * delta

        // Keep camera tilted upward comfortably
        cameraTiltUp.current = THREE.MathUtils.lerp(cameraTiltUp.current, 0.48, delta * 4.0)

        // Screen is pure black
        if (scene.background instanceof THREE.Color) {
          scene.background.set('#000000')
        }
        if (scene.fog instanceof THREE.Fog) {
          scene.fog.color.set('#000000')
          scene.fog.near = 10
          scene.fog.far = 140
        }

        // Entire screen turns into white wireframe exoskeleton!
        scene.overrideMaterial = exoWireframeMat
      }
    } else {
      // Normal state / reset
      warpTimer.current = 0
      warpVelocity.current = 0
      cameraTiltUp.current = THREE.MathUtils.lerp(cameraTiltUp.current, 0, delta * 5.0)

      if (scene.overrideMaterial !== null) {
        scene.overrideMaterial = null
      }
      if (scene.background instanceof THREE.Color) {
        scene.background.set('#eef2f6')
      }
      if (scene.fog instanceof THREE.Fog) {
        scene.fog.color.set('#eef2f6')
        scene.fog.near = THREE.MathUtils.damp(scene.fog.near, 18, 3.0, delta)
        scene.fog.far = THREE.MathUtils.damp(scene.fog.far, 85, 3.0, delta)
      }

      if (Math.abs(pCam.fov - 46) > 0.1) {
        pCam.fov = THREE.MathUtils.lerp(pCam.fov, 46, delta * 4.0)
        pCam.updateProjectionMatrix()
      }
      // Smooth ambient auto-walk speed: steady gentle stroll down the infinite corridor
      if (currentScroll.current < 0.92) {
        ambientAutoWalk.current += delta * 2.2
      }
    }

    // Detect touch / mobile device
    const isTouchDevice = typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)

    // Smoothly interpolate calibrated mobile gyroscope tilt
    gyroSmoothed.current.x = THREE.MathUtils.damp(gyroSmoothed.current.x, gyroTarget.current.x, 5.5, delta)
    gyroSmoothed.current.y = THREE.MathUtils.damp(gyroSmoothed.current.y, gyroTarget.current.y, 5.5, delta)

    // On mobile touch devices: if gyro is active use gyro, else fallback to touchDrag
    const effectiveMobileX = gyroActive.current ? gyroSmoothed.current.x : touchDrag.current.x
    const effectiveMobileY = gyroActive.current ? gyroSmoothed.current.y : touchDrag.current.y

    const curMx = isTouchDevice ? effectiveMobileX : mouseNDC.current.x
    const curMy = isTouchDevice ? effectiveMobileY : mouseNDC.current.y
    const parallaxScale = reducedMotion ? 0.2 : 1.0

    // Velocity calculation for dynamic footstep rhythm
    const rawVel = Math.abs(currentScroll.current - prevScrollVal.current) / Math.max(delta, 0.001)
    prevScrollVal.current = currentScroll.current
    scrollVelocity.current = THREE.MathUtils.damp(scrollVelocity.current, rawVel, 6.0, delta)
    const velocityFactor = THREE.MathUtils.clamp(0.4 + scrollVelocity.current * 2.0, 0, 1)

    // Shrine Walk forward progress along Z
    const totalTravel = 52.0
    const forwardZ    = ambientAutoWalk.current + currentScroll.current * totalTravel

    // Footstep Bob Rhythm
    const walkCycleSpeed = 3.6
    const walkCyclePhase = forwardZ * walkCycleSpeed * 0.4
    const rawStepBob = Math.abs(Math.sin(walkCyclePhase))
    const stepBobY   = rawStepBob * 0.038 * velocityFactor
    const stepBobRoll = Math.sin(walkCyclePhase * 0.5) * 0.007 * velocityFactor

    // Footstep Dust Burst on Bob Peak
    const isBobRising = rawStepBob > lastBobVal.current
    if (wasBobRising.current && !isBobRising && lastBobVal.current > 0.8 && velocityFactor > 0.15) {
      stepCount.current++
      const footSide = (stepCount.current % 2 === 0 ? 1 : -1) as -1 | 1
      dustRef.current?.burst(footSide, pCam.position.z, pCam.position.x)
    }
    wasBobRising.current = isBobRising
    lastBobVal.current = rawStepBob

    // ── TWO-WAY INFINITE SEAMLESS WRAP ──────────────────────────────────────
    // Guarantees all 28 gates stay strictly within the visible corridor window around the camera,
    // whether the user scrolls forward OR backward. This completely eliminates empty white screen!
    if (groupRef.current) {
      groupRef.current.position.z = forwardZ
      const children = groupRef.current.children
      const LOOP_SIZE = GATE_COUNT * SPACING // 98 units
      const MAX_Z = 12
      const MIN_Z = MAX_Z - LOOP_SIZE // -86 units (Gates strictly live in [12, -86], leaving 114+ units of open misty valley before Fuji!)

      for (let i = 0; i < children.length; i++) {
        const child = children[i]
        let worldZ = child.position.z + forwardZ
        let didWrap = false

        // Forward wrapping: gates that pass behind camera wrap to the front
        while (worldZ > MAX_Z) {
          child.position.z -= LOOP_SIZE
          worldZ = child.position.z + forwardZ
          didWrap = true
        }

        // Backward wrapping: gates that fall behind during reverse scroll wrap forward
        while (worldZ < MIN_Z) {
          child.position.z += LOOP_SIZE
          worldZ = child.position.z + forwardZ
          didWrap = true
        }

        // Only re-compute S-curve offset when gate position along Z actually changed
        if (didWrap) {
          const offset = getPathOffset(child.position.z)
          child.position.x = offset.x
          child.rotation.y = offset.rotY
        }
      }
    }

    // Curved Path Following for Camera
    const camPathZ = pCam.position.z - forwardZ
    const camOffset = getPathOffset(camPathZ)

    // Look ahead 14 units down the curving corridor for smooth cinematic steering
    const aheadPathZ = camPathZ - 14
    const aheadOffset = getPathOffset(aheadPathZ)
    const deltaX = aheadOffset.x - camOffset.x
    // In Three.js: looking down -Z, turning left towards -X is positive Y rotation
    const curveLookAngle = Math.atan2(-deltaX, 14)

    // Camera with walking bob & roll & curve following
    // High damping rates (14.0 / 12.0) ensure camera NEVER drifts off-path during reverse or fast scroll
    const targetCamY = 2.3 + stepBobY + cameraTiltUp.current * 1.3
    const targetRotX = curMy * 0.25 * parallaxScale + cameraTiltUp.current

    pCam.position.x = THREE.MathUtils.damp(pCam.position.x, camOffset.x + curMx * 0.35 * parallaxScale, 14.0, delta)
    pCam.position.y = THREE.MathUtils.damp(pCam.position.y, targetCamY, 6.0, delta)
    pCam.rotation.x = THREE.MathUtils.damp(pCam.rotation.x, targetRotX, 4.5, delta)
    pCam.rotation.y = THREE.MathUtils.damp(pCam.rotation.y, curveLookAngle - curMx * 0.35 * parallaxScale, 12.0, delta)
    pCam.rotation.z = THREE.MathUtils.damp(pCam.rotation.z, -curMx * 0.05 * parallaxScale + stepBobRoll, 4.5, delta)

    // Stable day fog: keep distances wide and stable so scenery is always clearly visible without whiteouts
    if (!isWarping && scene.fog instanceof THREE.Fog) {
      scene.fog.near = THREE.MathUtils.damp(scene.fog.near, 18, 3.0, delta)
      scene.fog.far  = THREE.MathUtils.damp(scene.fog.far, 85, 3.0, delta)
    }

    // Mount Fuji distant horizon parallax (subtle responsive shift when looking left/right/up/down)
    if (fujiRef.current) {
      fujiRef.current.position.x = THREE.MathUtils.damp(fujiRef.current.position.x, curMx * 4.5, 3.5, delta)
      fujiRef.current.position.y = THREE.MathUtils.damp(fujiRef.current.position.y, 16.0 + curMy * 1.5, 3.5, delta)
    }

    if (!isWarping) {
      pCam.fov = THREE.MathUtils.damp(pCam.fov, 46, 4.0, delta)
      pCam.updateProjectionMatrix()
    }

    // Hide mist plane during exoskeleton phase so Mount Fuji wireframe is clearly visible
    if (mistMeshRef.current) {
      mistMeshRef.current.visible = !isWarping || warpTimer.current < 1.05
    }
  })

  return (
    <group>
      {/* Seamless Continuous Global Meadow Ground (Guarantees zero ground seams, lines or cracks) */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.04, -120]}>
        <planeGeometry args={[700, 700]} />
        <meshStandardMaterial color="#6fa883" roughness={0.92} />
      </mesh>

      {/* Distant Majestic Japanese Horizon: Snow-Capped Mount Fuji */}
      <MountFuji ref={fujiRef} />

      {/* Atmospheric Valley Mist (Separates foreground Torii corridor from distant Mount Fuji) */}
      <mesh ref={mistMeshRef} position={[0, 11, -94]}>
        <planeGeometry args={[700, 36]} />
        <meshBasicMaterial 
          map={horizonMistTex}
          transparent 
          opacity={0.98} 
          fog={false} 
          depthWrite={false} 
        />
      </mesh>

      <FootstepDust ref={dustRef} />

      <group ref={groupRef}>
        {elements.map((el, i) => (
          <group key={i} position={[el.x, 0, el.z]} rotation={[0, el.rotY, 0]}>
            <Ground seed={i} />
            <ToriiGate />
            {el.leftTree.show && (
              <LowPolyTree
                position={[el.leftTree.x, 0, 0]}
                scale={el.leftTree.scale}
                leafColor={el.leftTree.variant === 'sakura' ? '#d48ea1' : '#f0f0f0'}
              />
            )}
            {el.outerLeftTree.show && (
              <LowPolyTree
                position={[el.outerLeftTree.x, 0, -0.6]}
                scale={el.outerLeftTree.scale}
                leafColor={el.outerLeftTree.variant === 'sakura' ? '#d48ea1' : '#f0f0f0'}
              />
            )}
            {el.rightTree.show && (
              <LowPolyTree
                position={[el.rightTree.x, 0, 0]}
                scale={el.rightTree.scale}
                leafColor={el.rightTree.variant === 'sakura' ? '#d48ea1' : '#f0f0f0'}
              />
            )}
            {el.outerRightTree.show && (
              <LowPolyTree
                position={[el.outerRightTree.x, 0, -0.8]}
                scale={el.outerRightTree.scale}
                leafColor={el.outerRightTree.variant === 'sakura' ? '#d48ea1' : '#f0f0f0'}
              />
            )}
          </group>
        ))}
      </group>
    </group>
  )
}
