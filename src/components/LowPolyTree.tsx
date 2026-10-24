import * as THREE from 'three'

interface LowPolyTreeProps {
  position?: [number, number, number]
  scale?: number
  leafColor?: string
  trunkColor?: string
}

// Module-level shared static geometries (reused by all 56 trees, 0 allocations per frame)
const trunkGeo = new THREE.CylinderGeometry(0.28, 0.62, 2.9, 8)
const leafGeoBig = new THREE.DodecahedronGeometry(2.3, 0)
const leafGeoSmall = new THREE.DodecahedronGeometry(1.4, 0)
const petalGeo = new THREE.CircleGeometry(0.14, 5)

// Module-level shared materials (reused by all 56 trees, avoids GPU shader uniform rebinds)
const blackMaterial = new THREE.MeshBasicMaterial({ color: '#161216', side: THREE.BackSide })
const trunkMat = new THREE.MeshStandardMaterial({ color: '#5c4033', roughness: 0.82, flatShading: true })
const sakuraLeafMat = new THREE.MeshStandardMaterial({ color: '#d48ea1', roughness: 0.65, flatShading: true })
const whiteLeafMat = new THREE.MeshStandardMaterial({ color: '#f0f0f0', roughness: 0.65, flatShading: true })
const sakuraPetalMat = new THREE.MeshBasicMaterial({ color: '#d48ea1' })
const whitePetalMat = new THREE.MeshBasicMaterial({ color: '#f0f0f0' })

// Static petal offsets
const STATIC_PETALS = [
  { x: -0.65, z: 0.45, rot: 0.4, scale: 0.9 },
  { x: 0.72, z: -0.38, rot: 1.2, scale: 1.05 },
  { x: -0.28, z: -0.68, rot: 2.1, scale: 0.85 },
  { x: 0.82, z: 0.52, rot: 0.8, scale: 1.0 },
]

export default function LowPolyTree({
  position = [0, 0, 0],
  scale = 1,
  leafColor = '#d48ea1',
}: LowPolyTreeProps) {
  const isSakura = leafColor === '#d48ea1'
  const leafMat = isSakura ? sakuraLeafMat : whiteLeafMat
  const petalMat = isSakura ? sakuraPetalMat : whitePetalMat

  return (
    <group position={position} scale={scale} dispose={null}>
      {/* ── Beautiful Unified Low-Poly Trunk ─────────────────────────────── */}
      <group position={[0, 1.45, 0]} rotation={[0.03, 0.2, -0.02]}>
        <mesh castShadow receiveShadow geometry={trunkGeo} material={trunkMat} />
        <mesh geometry={trunkGeo} scale={[1.06, 1.01, 1.06]} material={blackMaterial} />
      </group>

      {/* Delicate fallen petals lying flat on grass (No shadows for max performance) */}
      {STATIC_PETALS.map((p, i) => (
        <mesh
          key={i}
          position={[p.x, 0.015, p.z]}
          rotation={[-Math.PI / 2, 0, p.rot]}
          scale={p.scale}
          geometry={petalGeo}
          material={petalMat}
        />
      ))}

      {/* ── Foliage Canopy ──────────────────────────────────────────────── */}
      {/* Main Central Foliage (Primary shadow caster) */}
      <group position={[0, 3.8, 0]} rotation={[0.2, 0.5, 0.1]}>
        <mesh castShadow receiveShadow geometry={leafGeoBig} material={leafMat} />
        <mesh geometry={leafGeoBig} scale={1.03} material={blackMaterial} />
      </group>

      {/* Small Left Cluster (Sub-cluster: receiveShadow only to avoid shadow map overload) */}
      <group position={[-1.2, 3.2, 0.5]} rotation={[0.1, 0.8, -0.2]}>
        <mesh receiveShadow geometry={leafGeoSmall} material={leafMat} />
        <mesh geometry={leafGeoSmall} scale={1.04} material={blackMaterial} />
      </group>

      {/* Small Right Cluster */}
      <group position={[1.4, 3.0, -0.4]} rotation={[-0.2, 0.3, 0.3]}>
        <mesh receiveShadow geometry={leafGeoSmall} material={leafMat} />
        <mesh geometry={leafGeoSmall} scale={1.04} material={blackMaterial} />
      </group>
      
      {/* Small Top-Back Cluster */}
      <group position={[0.3, 4.6, -1.0]} rotation={[-0.3, 0.5, -0.1]}>
        <mesh receiveShadow geometry={leafGeoSmall} material={leafMat} />
        <mesh geometry={leafGeoSmall} scale={1.04} material={blackMaterial} />
      </group>
    </group>
  )
}
