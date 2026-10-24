import * as THREE from 'three'

// Authentic Japanese Shinto Torii Gate with Traditional Curved Kasagi and Kusabi Pegs
const WOOD_COLOR = "#a85d5d"     // Vermilion/pinkish shrine wood
const WOOD_DARK  = "#8c4949"     // Shadowed wood for depth
const CAP_COLOR  = "#2b2e33"     // Dark slate ridge cap
const STONE_BASE = "#9aa3a8"     // Chiseled stone footing

// Shared module materials
const blackMaterial = new THREE.MeshBasicMaterial({ color: 'black', side: THREE.BackSide })
const woodMat = new THREE.MeshStandardMaterial({ color: WOOD_COLOR, roughness: 0.6, flatShading: true })
const woodDarkMat = new THREE.MeshStandardMaterial({ color: WOOD_DARK, roughness: 0.7, flatShading: true })
const capMat = new THREE.MeshStandardMaterial({ color: CAP_COLOR, roughness: 0.5, flatShading: true })
const stoneMat = new THREE.MeshStandardMaterial({ color: STONE_BASE, roughness: 0.8, flatShading: true })
const plaqueMat = new THREE.MeshStandardMaterial({ color: '#1a1a1a', roughness: 0.8 })

// Shared module geometries (created once, shared by all 14 gates)
function buildKasagiGeometry(): THREE.BufferGeometry {
  const shape = new THREE.Shape()
  shape.moveTo(-3.0, 0.45)
  shape.quadraticCurveTo(0, 0.25, 3.0, 0.45)
  shape.lineTo(3.2, 0.6)
  shape.quadraticCurveTo(0, 0.4, -3.2, 0.6)
  shape.closePath()
  
  const extrudeSettings = {
    depth: 0.5,
    bevelEnabled: true,
    bevelSegments: 2,
    steps: 1,
    bevelSize: 0.05,
    bevelThickness: 0.05
  }
  return new THREE.ExtrudeGeometry(shape, extrudeSettings)
}

const kasagiGeo = buildKasagiGeometry()
const pillarGeo = new THREE.CylinderGeometry(0.22, 0.28, 5.4, 8)
const footingGeo = new THREE.CylinderGeometry(0.38, 0.52, 0.6, 6)
const pegGeo = new THREE.BoxGeometry(0.5, 0.16, 0.32)
const capGeo = new THREE.BoxGeometry(6.0, 0.14, 0.54)
const crossbarGeo = new THREE.BoxGeometry(4.8, 0.28, 0.3)
const centerSupportGeo1 = new THREE.BoxGeometry(0.35, 0.72, 0.22)
const centerSupportGeo2 = new THREE.BoxGeometry(0.28, 0.55, 0.05)

export default function ToriiGate(props?: any) {
  return (
    <group {...props} dispose={null}>
      {/* ================= LEFT PILLAR ================= */}
      <group position={[-2.0, 0, 0]}>
        {/* Tapered Pillar (Hashira) with inward lean */}
        <group position={[0, 2.7, 0]} rotation={[0, 0, -0.035]}>
          <mesh castShadow receiveShadow geometry={pillarGeo} material={woodMat} />
          <mesh geometry={pillarGeo} scale={[1.02, 1.01, 1.02]} material={blackMaterial} />
        </group>

        {/* Flared Stone Footing */}
        <group position={[0, 0.3, 0]}>
          <mesh receiveShadow geometry={footingGeo} material={stoneMat} />
          <mesh geometry={footingGeo} scale={1.015} material={blackMaterial} />
        </group>

        {/* Kusabi (Wedge Peg) */}
        <group position={[-0.2, 4.15, 0]}>
          <mesh receiveShadow geometry={pegGeo} material={woodDarkMat} />
          <mesh geometry={pegGeo} scale={1.03} material={blackMaterial} />
        </group>
      </group>

      {/* ================= RIGHT PILLAR ================= */}
      <group position={[2.0, 0, 0]}>
        {/* Tapered Pillar with inward lean */}
        <group position={[0, 2.7, 0]} rotation={[0, 0, 0.035]}>
          <mesh castShadow receiveShadow geometry={pillarGeo} material={woodMat} />
          <mesh geometry={pillarGeo} scale={[1.02, 1.01, 1.02]} material={blackMaterial} />
        </group>

        {/* Flared Stone Footing */}
        <group position={[0, 0.3, 0]}>
          <mesh receiveShadow geometry={footingGeo} material={stoneMat} />
          <mesh geometry={footingGeo} scale={1.015} material={blackMaterial} />
        </group>

        {/* Kusabi (Wedge Peg) */}
        <group position={[0.2, 4.15, 0]}>
          <mesh receiveShadow geometry={pegGeo} material={woodDarkMat} />
          <mesh geometry={pegGeo} scale={1.03} material={blackMaterial} />
        </group>
      </group>

      {/* ================= UPPER CROSSBAR (Kasagi & Shimaki) ================= */}
      <group position={[0, 4.9, -0.25]}>
        <mesh castShadow receiveShadow geometry={kasagiGeo} material={woodMat} />
        <mesh geometry={kasagiGeo} scale={1.015} material={blackMaterial} />
      </group>

      {/* Dark Slate Roof Ridge Cap */}
      <group position={[0, 5.5, 0]}>
        <mesh castShadow receiveShadow geometry={capGeo} material={capMat} />
        <mesh geometry={capGeo} scale={1.015} material={blackMaterial} />
      </group>

      {/* ================= LOWER CROSSBAR (Nuki) ================= */}
      <group position={[0, 4.15, 0]}>
        <mesh castShadow receiveShadow geometry={crossbarGeo} material={woodMat} />
        <mesh geometry={crossbarGeo} scale={1.015} material={blackMaterial} />
      </group>

      {/* ================= CENTER SUPPORT (Gakuzuka & Plaque) ================= */}
      <group position={[0, 4.65, 0]}>
        <mesh receiveShadow geometry={centerSupportGeo1} material={woodDarkMat} />
        <mesh geometry={centerSupportGeo1} scale={1.02} material={blackMaterial} />
      </group>
      <group position={[0, 4.65, 0.12]}>
        <mesh receiveShadow geometry={centerSupportGeo2} material={plaqueMat} />
        <mesh geometry={centerSupportGeo2} scale={1.02} material={blackMaterial} />
      </group>
    </group>
  )
}
