import { useMemo, forwardRef } from 'react'
import * as THREE from 'three'

interface MountFujiProps {
  curMx?: number
}

// Crisp toon outline material for stylized low-poly aesthetic
const outlineMat = new THREE.MeshBasicMaterial({ 
  color: '#1a2433', 
  side: THREE.BackSide, 
  fog: false 
})

// Soft daylight sun bloom texture (organic Gaussian falloff, zero harsh edges)
function createSunBloomTexture(): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = 512
  canvas.height = 512
  const ctx = canvas.getContext('2d')
  if (!ctx) return new THREE.CanvasTexture(canvas)

  const cx = 256
  const cy = 256
  const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 256)
  grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)')
  grad.addColorStop(0.14, 'rgba(255, 252, 230, 0.96)')
  grad.addColorStop(0.30, 'rgba(254, 240, 138, 0.72)')
  grad.addColorStop(0.55, 'rgba(253, 224, 71, 0.30)')
  grad.addColorStop(0.78, 'rgba(251, 191, 36, 0.08)')
  grad.addColorStop(1.0, 'rgba(245, 158, 11, 0.0)')

  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 512, 512)

  const tex = new THREE.CanvasTexture(canvas)
  tex.needsUpdate = true
  return tex
}

const MountFuji = forwardRef<THREE.Group, MountFujiProps>(function MountFuji(_, ref) {
  const sunBloom = useMemo(() => createSunBloomTexture(), [])

  // ── 1. Massive, Grand Mount Fuji Stratovolcano Cone ─────────────────────────
  // Elevated so its snowy peak and upper slopes tower majestically above the morning mist
  const fujiGeo = useMemo(() => {
    const geo = new THREE.ConeGeometry(152, 106, 36, 8, true)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) // -53 to +53
      const normY = (y + 53) / 106 // 0 at base, 1 at peak
      // Dramatic Japanese concave flare: mountain sweeps wide and flat into the horizon
      const flare = Math.pow(1 - normY, 1.85) * 1.55 + (1 - normY) * 0.45
      pos.setX(i, pos.getX(i) * (normY < 0.985 ? (1 + flare * 0.46) : 1))
      pos.setZ(i, pos.getZ(i) * (normY < 0.985 ? (1 + flare * 0.46) : 1))
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  // ── 2. Iconic Alpine Snowcap Summit (Tops upper 38% of Mount Fuji) ──────────
  const snowCapGeo = useMemo(() => {
    const geo = new THREE.ConeGeometry(70, 44, 36, 6, true)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i) // -22 to +22
      const normY = (y + 22) / 44
      const angle = Math.atan2(pos.getZ(i), pos.getX(i))
      // 7 alpine arêtes with jagged cascading snow tongues
      const scallops = Math.sin(angle * 7) * 2.2 + Math.cos(angle * 14) * 0.75
      if (normY < 0.30) {
        pos.setY(i, y + scallops)
      }
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  // ── 3. Distant Side Mountain Geometries for Continuous Panorama ─────────────
  // Flanking mountain peak geometry A (sharp alpine peak)
  const sidePeakGeoA = useMemo(() => {
    const geo = new THREE.ConeGeometry(65, 68, 18, 5, true)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const normY = (y + 34) / 68
      const flare = Math.pow(1 - normY, 1.7) * 0.8
      pos.setX(i, pos.getX(i) * (1 + flare))
      pos.setZ(i, pos.getZ(i) * (1 + flare))
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  // Side peak snowcap
  const sideSnowCapGeoA = useMemo(() => {
    const geo = new THREE.ConeGeometry(32, 28, 18, 4, true)
    geo.computeVertexNormals()
    return geo
  }, [])

  // Flanking mountain peak geometry B (rugged ridge)
  const sidePeakGeoB = useMemo(() => {
    const geo = new THREE.ConeGeometry(82, 64, 16, 4, true)
    const pos = geo.attributes.position
    for (let i = 0; i < pos.count; i++) {
      const y = pos.getY(i)
      const normY = (y + 32) / 64
      const flare = Math.pow(1 - normY, 1.6) * 0.9
      pos.setX(i, pos.getX(i) * (1 + flare * 1.15))
      pos.setZ(i, pos.getZ(i) * (1 + flare * 0.85))
    }
    geo.computeVertexNormals()
    return geo
  }, [])

  // Low-poly rolling foothill ridges
  const foothillGeo = useMemo(() => new THREE.DodecahedronGeometry(38, 1), [])

  return (
    // Placed far in the distance at Z = -210, compressed in Z (scale 0.12) so it stays strictly on the horizon
    <group ref={ref} position={[0, 16.0, -210]} scale={[1, 1, 0.12]} dispose={null}>
      {/* ── 1. The Radiant Japanese Sun (Large, Majestic Morning Sun) ──────── */}
      <group position={[60, 56, 8]}>
        {/* Large Soft Golden Gaussian Atmosphere Bloom (125x125) */}
        <mesh position={[0, 0, 0]}>
          <planeGeometry args={[125, 125]} />
          <meshBasicMaterial 
            map={sunBloom} 
            transparent 
            opacity={0.94} 
            fog={false} 
            depthWrite={false} 
          />
        </mesh>

        {/* Enlarged Luminous Morning Sun Disc Core (Radius 14) */}
        <mesh position={[0, 0, 0.2]}>
          <circleGeometry args={[14.0, 36]} />
          <meshBasicMaterial color="#ffffff" fog={false} />
        </mesh>

        {/* Warm Morning Sunlight Glow */}
        <pointLight color="#fff8e7" intensity={3.4} distance={180} decay={1.3} />
      </group>

      {/* ── 2. The Great Mount Fuji (Centered, Symmetrical, Wide & Majestic) ── */}
      {/* Mountain Body (Deep Slate Indigo with Faceted Low-Poly Shading) */}
      <group position={[0, 11.5, 0]} rotation={[0, 0.2, 0]}>
        <mesh geometry={fujiGeo} receiveShadow={false}>
          <meshStandardMaterial 
            color="#3a4d65" 
            roughness={0.72} 
            metalness={0.04} 
            flatShading 
            fog={false}
          />
        </mesh>
        <mesh geometry={fujiGeo} scale={1.008} material={outlineMat} />
      </group>

      {/* Pristine Alpine Snow Summit Peak (No Crater / Pure Mountain) */}
      <group position={[0, 44.0, 0]} rotation={[0, 0.2, 0]} scale={[1.025, 1.012, 1.025]}>
        <mesh geometry={snowCapGeo} receiveShadow={false}>
          <meshStandardMaterial 
            color="#f8fafc" 
            roughness={0.50} 
            metalness={0.02} 
            flatShading 
            fog={false}
            polygonOffset
            polygonOffsetFactor={-2.0}
            polygonOffsetUnits={-4.0}
          />
        </mesh>
        <mesh geometry={snowCapGeo} scale={1.012} material={outlineMat} />
      </group>

      {/* ── 3. Continuous Panoramic Mountain Ranges (Left Horizon) ──────────── */}
      {/* Left Range 1 (Near-Mid Peak) */}
      <group position={[-110, 8.0, -16]} scale={[1.25, 1.15, 1.2]} rotation={[0, 0.35, 0]}>
        <mesh geometry={sidePeakGeoA}>
          <meshStandardMaterial color="#43566f" roughness={0.75} flatShading fog={false} />
        </mesh>
        <mesh geometry={sidePeakGeoA} scale={1.01} material={outlineMat} />
        <mesh geometry={sideSnowCapGeoA} position={[0, 23.0, 0]} scale={[1.025, 1.015, 1.025]}>
          <meshStandardMaterial 
            color="#f1f5f9" 
            roughness={0.5} 
            flatShading 
            fog={false} 
            polygonOffset
            polygonOffsetFactor={-2.0}
            polygonOffsetUnits={-4.0}
          />
        </mesh>
      </group>

      {/* Left Range 2 (Grand Mountain Peak) */}
      <group position={[-185, 12.0, -30]} scale={[1.65, 1.35, 1.3]} rotation={[0, -0.5, 0]}>
        <mesh geometry={sidePeakGeoB}>
          <meshStandardMaterial color="#3b4d64" roughness={0.75} flatShading fog={false} />
        </mesh>
        <mesh geometry={sidePeakGeoB} scale={1.01} material={outlineMat} />
        <mesh geometry={sideSnowCapGeoA} position={[0, 21.0, 0]} scale={[1.33, 1.32, 1.33]}>
          <meshStandardMaterial 
            color="#f1f5f9" 
            roughness={0.5} 
            flatShading 
            fog={false} 
            polygonOffset
            polygonOffsetFactor={-2.0}
            polygonOffsetUnits={-4.0}
          />
        </mesh>
      </group>

      {/* Left Range 3 (Distant Horizon Giant) */}
      <group position={[-270, 9.0, -42]} scale={[2.0, 1.25, 1.4]} rotation={[0, 0.7, 0]}>
        <mesh geometry={sidePeakGeoA}>
          <meshStandardMaterial color="#34455a" roughness={0.78} flatShading fog={false} />
        </mesh>
        <mesh geometry={sidePeakGeoA} scale={1.008} material={outlineMat} />
      </group>

      {/* Left Range 4 (Far Perimeter Horizon Peak) */}
      <group position={[-355, 7.0, -55]} scale={[2.4, 1.15, 1.5]} rotation={[0, -0.3, 0]}>
        <mesh geometry={sidePeakGeoB}>
          <meshStandardMaterial color="#2d3b4e" roughness={0.80} flatShading fog={false} />
        </mesh>
      </group>

      {/* ── 4. Continuous Panoramic Mountain Ranges (Right Horizon) ──────────── */}
      {/* Right Range 1 (Near-Mid Peak framing the Sun) */}
      <group position={[115, 8.0, -16]} scale={[1.25, 1.12, 1.2]} rotation={[0, -0.4, 0]}>
        <mesh geometry={sidePeakGeoA}>
          <meshStandardMaterial color="#485c76" roughness={0.75} flatShading fog={false} />
        </mesh>
        <mesh geometry={sidePeakGeoA} scale={1.01} material={outlineMat} />
        <mesh geometry={sideSnowCapGeoA} position={[0, 23.0, 0]} scale={[1.025, 1.015, 1.025]}>
          <meshStandardMaterial 
            color="#f1f5f9" 
            roughness={0.5} 
            flatShading 
            fog={false} 
            polygonOffset
            polygonOffsetFactor={-2.0}
            polygonOffsetUnits={-4.0}
          />
        </mesh>
      </group>

      {/* Right Range 2 (Grand Mountain Peak filling the right vista) */}
      <group position={[192, 13.0, -30]} scale={[1.7, 1.38, 1.3]} rotation={[0, 0.6, 0]}>
        <mesh geometry={sidePeakGeoB}>
          <meshStandardMaterial color="#3d5068" roughness={0.75} flatShading fog={false} />
        </mesh>
        <mesh geometry={sidePeakGeoB} scale={1.01} material={outlineMat} />
        <mesh geometry={sideSnowCapGeoA} position={[0, 21.0, 0]} scale={[1.38, 1.37, 1.38]}>
          <meshStandardMaterial 
            color="#f1f5f9" 
            roughness={0.5} 
            flatShading 
            fog={false} 
            polygonOffset
            polygonOffsetFactor={-2.0}
            polygonOffsetUnits={-4.0}
          />
        </mesh>
      </group>

      {/* Right Range 3 (Distant Horizon Giant on the right) */}
      <group position={[275, 10.0, -42]} scale={[2.1, 1.28, 1.4]} rotation={[0, -0.65, 0]}>
        <mesh geometry={sidePeakGeoA}>
          <meshStandardMaterial color="#36475d" roughness={0.78} flatShading fog={false} />
        </mesh>
        <mesh geometry={sidePeakGeoA} scale={1.008} material={outlineMat} />
      </group>

      {/* Right Range 4 (Far Perimeter Horizon Peak on the right) */}
      <group position={[360, 7.0, -55]} scale={[2.5, 1.15, 1.5]} rotation={[0, 0.35, 0]}>
        <mesh geometry={sidePeakGeoB}>
          <meshStandardMaterial color="#2d3b4e" roughness={0.80} flatShading fog={false} />
        </mesh>
      </group>

      {/* ── 5. Layered Foothill Ridges Across Horizon ─────────────────────── */}
      {/* Left Foothill Ridges */}
      <group position={[-75, -2.0, -8]} scale={[2.6, 0.9, 1.3]}>
        <mesh geometry={foothillGeo}>
          <meshStandardMaterial color="#4d6178" roughness={0.8} flatShading fog={false} />
        </mesh>
      </group>
      <group position={[-148, -3.0, -14]} scale={[3.0, 1.0, 1.4]}>
        <mesh geometry={foothillGeo}>
          <meshStandardMaterial color="#45586e" roughness={0.8} flatShading fog={false} />
        </mesh>
      </group>
      <group position={[-230, -4.0, -20]} scale={[3.4, 1.1, 1.5]}>
        <mesh geometry={foothillGeo}>
          <meshStandardMaterial color="#3d4f63" roughness={0.8} flatShading fog={false} />
        </mesh>
      </group>

      {/* Right Foothill Ridges */}
      <group position={[78, -2.0, -8]} scale={[2.6, 0.9, 1.3]}>
        <mesh geometry={foothillGeo}>
          <meshStandardMaterial color="#4a5d74" roughness={0.8} flatShading fog={false} />
        </mesh>
      </group>
      <group position={[152, -3.0, -14]} scale={[3.0, 1.0, 1.4]}>
        <mesh geometry={foothillGeo}>
          <meshStandardMaterial color="#42556b" roughness={0.8} flatShading fog={false} />
        </mesh>
      </group>
      <group position={[235, -4.0, -20]} scale={[3.4, 1.1, 1.5]}>
        <mesh geometry={foothillGeo}>
          <meshStandardMaterial color="#3a4c60" roughness={0.8} flatShading fog={false} />
        </mesh>
      </group>
    </group>
  )
})

export default MountFuji
