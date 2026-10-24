import { useMemo } from 'react'

export default function Environment3D() {
  // Mountain silhouettes in distance
  const mountainGeom = useMemo(() => {
    return [
      { x: -55, y: 32, z: -110, scale: 42 },
      { x: -24, y: 36, z: -125, scale: 50 },
      { x: 20, y: 34, z: -120, scale: 45 },
      { x: 55, y: 28, z: -105, scale: 38 },
    ]
  }, [])

  return (
    <group>
      {/* ================= CELESTIAL GLOWING MOON ================= */}
      <group position={[0, 14, -68]}>
        {/* Core Moon Sphere */}
        <mesh>
          <sphereGeometry args={[10, 32, 32]} />
          <meshBasicMaterial color="#fff8e8" fog={false} />
        </mesh>
        
        {/* Inner Moon Glow Halo */}
        <mesh position={[0, 0, -0.4]}>
          <planeGeometry args={[32, 32]} />
          <meshBasicMaterial
            color="#ffeacc"
            transparent
            opacity={0.38}
            depthWrite={false}
            fog={false}
          />
        </mesh>

        {/* Outer Mystical Warm Corona */}
        <mesh position={[0, 0, -0.8]}>
          <planeGeometry args={[70, 70]} />
          <meshBasicMaterial
            color="#ff9944"
            transparent
            opacity={0.18}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      </group>

      {/* ================= DISTANT MOUNTAIN RIDGES ================= */}
      <group>
        {mountainGeom.map((m, i) => (
          <mesh key={i} position={[m.x, m.y / 2, m.z]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[m.scale, m.y, 4]} />
            <meshStandardMaterial
              color="#0d1420"
              roughness={1.0}
              flatShading
            />
          </mesh>
        ))}
      </group>
    </group>
  )
}
