import { useRef, useMemo, useImperativeHandle, forwardRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

export interface FootstepDustHandle {
  burst: (foot: -1 | 1, camZ: number) => void
}

const MAX_PARTICLES = 48
const BURST_COUNT = 6
const PARTICLE_LIFETIME = 0.42 // seconds

export const FootstepDust = forwardRef<FootstepDustHandle, {}>((_, ref) => {
  const pointsRef = useRef<THREE.Points>(null)

  // Particle state arrays
  const particles = useMemo(() => {
    return Array.from({ length: MAX_PARTICLES }, () => ({
      x: 0,
      y: -999, // inactive below ground
      z: 0,
      vx: 0,
      vy: 0,
      vz: 0,
      age: PARTICLE_LIFETIME,
    }))
  }, [])

  const nextIdx = useRef(0)

  // Positions buffer
  const positions = useMemo(() => {
    const pos = new Float32Array(MAX_PARTICLES * 3)
    for (let i = 0; i < MAX_PARTICLES; i++) {
      pos[i * 3 + 1] = -999
    }
    return pos
  }, [])

  const geometry = useMemo(() => {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
    return geo
  }, [positions])

  // Soft circular dust puff texture
  const dustTexture = useMemo(() => {
    const canvas = document.createElement('canvas')
    canvas.width = 32
    canvas.height = 32
    const ctx = canvas.getContext('2d')!
    const g = ctx.createRadialGradient(16, 16, 0, 16, 16, 16)
    g.addColorStop(0, 'rgba(230, 220, 205, 0.9)')
    g.addColorStop(0.4, 'rgba(215, 200, 185, 0.4)')
    g.addColorStop(1, 'rgba(200, 185, 170, 0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 32, 32)
    return new THREE.CanvasTexture(canvas)
  }, [])

  useImperativeHandle(ref, () => ({
    burst: (foot: -1 | 1, camZ: number) => {
      const baseX = foot * 0.32
      const baseY = 0.06
      const baseZ = camZ - 1.2

      for (let k = 0; k < BURST_COUNT; k++) {
        const idx = (nextIdx.current + k) % MAX_PARTICLES
        const p = particles[idx]
        const angle = Math.random() * Math.PI * 2
        const speed = 0.15 + Math.random() * 0.35

        p.x = baseX + (Math.random() - 0.5) * 0.16
        p.y = baseY + Math.random() * 0.04
        p.z = baseZ + (Math.random() - 0.5) * 0.16
        p.vx = Math.cos(angle) * speed * 0.6
        p.vy = 0.28 + Math.random() * 0.38 // slight upward puff
        p.vz = Math.sin(angle) * speed * 0.6
        p.age = 0
      }
      nextIdx.current = (nextIdx.current + BURST_COUNT) % MAX_PARTICLES
    },
  }))

  useFrame((_, delta) => {
    if (!pointsRef.current) return
    const posAttr = pointsRef.current.geometry.attributes.position
    let anyActive = false

    for (let i = 0; i < MAX_PARTICLES; i++) {
      const p = particles[i]
      if (p.age < PARTICLE_LIFETIME) {
        anyActive = true
        p.age += delta
        p.x += p.vx * delta
        p.y += p.vy * delta
        p.z += p.vz * delta
        p.vy -= 0.6 * delta // gravity
        p.vx *= 0.92 // air drag
        p.vz *= 0.92

        posAttr.setXYZ(i, p.x, p.y, p.z)
      } else {
        posAttr.setXYZ(i, 0, -999, 0)
      }
    }

    if (anyActive) {
      posAttr.needsUpdate = true
    }
  })

  return (
    <points ref={pointsRef} geometry={geometry}>
      <pointsMaterial
        map={dustTexture}
        size={0.22}
        sizeAttenuation
        transparent
        opacity={0.55}
        color="#d8cab8"
        depthWrite={false}
        blending={THREE.NormalBlending}
      />
    </points>
  )
})

export default FootstepDust
