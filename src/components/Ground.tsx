import { useMemo } from 'react'
import * as THREE from 'three'

// Reusable black material for toon outline
const blackMaterial = new THREE.MeshBasicMaterial({ color: '#161216', side: THREE.BackSide })

// Module-level shared geometries
const bladeGeo = new THREE.ConeGeometry(0.12, 0.55, 3)
const flowerGeo = new THREE.DodecahedronGeometry(0.08, 0)
const rockGeo = new THREE.DodecahedronGeometry(1, 0)
const lanternPostGeo = new THREE.BoxGeometry(0.35, 1.4, 0.35)
const lanternRoofGeo = new THREE.ConeGeometry(0.75, 0.45, 4)
const lanternChamberGeo = new THREE.BoxGeometry(0.42, 0.38, 0.42)
const lanternScreenGeo = new THREE.BoxGeometry(0.34, 0.3, 0.34)
const earthStripGeo = new THREE.PlaneGeometry(1.2, 7.6)
const mossBedGeo = new THREE.PlaneGeometry(4.4, 7.6)

// Module-level shared materials
const earthMat = new THREE.MeshStandardMaterial({ color: '#4e3c2d', roughness: 0.95, flatShading: true })
const mossMat = new THREE.MeshStandardMaterial({ color: '#3d4f40', roughness: 0.95, flatShading: true })
const bladeMat1 = new THREE.MeshStandardMaterial({ color: '#559169', roughness: 0.9, flatShading: true })
const bladeMat2 = new THREE.MeshStandardMaterial({ color: '#66a87b', roughness: 0.9, flatShading: true })
const bladeMat3 = new THREE.MeshStandardMaterial({ color: '#4a805c', roughness: 0.9, flatShading: true })
const flowerMat = new THREE.MeshBasicMaterial({ color: '#fffbe6' })
const rockMat = new THREE.MeshStandardMaterial({ color: '#9eaab0', roughness: 0.78, flatShading: true })
const lanternMat = new THREE.MeshStandardMaterial({ color: '#94a3a8', roughness: 0.85, flatShading: true })
const lanternChamberMat = new THREE.MeshStandardMaterial({ color: '#3b3b3b', roughness: 0.9 })
const lanternLightMat = new THREE.MeshBasicMaterial({ color: '#ffeaa7' })
const lanternRoofMat = new THREE.MeshStandardMaterial({ color: '#7f8e94', roughness: 0.8, flatShading: true })
const tileMatA = new THREE.MeshStandardMaterial({ color: '#d5dedb', roughness: 0.82, flatShading: true })
const tileMatB = new THREE.MeshStandardMaterial({ color: '#c8d4cf', roughness: 0.82, flatShading: true })

export default function Ground({ seed = 0 }: { seed?: number }) {
  // Deterministic seeded pseudorandom helper
  const rand = (offset: number) => {
    const x = Math.sin(seed * 37 + offset + 1) * 10000
    return x - Math.floor(x)
  }

  // Flagstone paving tiles
  const pavingTiles = useMemo(() => {
    const tiles = []
    const rows = 4
    for (let r = 0; r < rows; r++) {
      const zCenter = (r / rows) * 7.5 - 3.75 + 0.9
      tiles.push({
        x: -1.3,
        z: zCenter,
        w: 1.8 + rand(r * 5) * 0.3,
        d: 1.6 + rand(r * 5 + 1) * 0.2,
        isA: rand(r * 5 + 2) > 0.5,
        rot: (rand(r * 5 + 3) - 0.5) * 0.04,
      })
      tiles.push({
        x: 0.85,
        z: zCenter + (rand(r * 7) - 0.5) * 0.2,
        w: 2.1 + rand(r * 7 + 1) * 0.3,
        d: 1.5 + rand(r * 7 + 2) * 0.2,
        isA: rand(r * 7 + 3) > 0.4,
        rot: (rand(r * 7 + 4) - 0.5) * 0.04,
      })
    }
    return tiles
  }, [seed])

  // Low-poly decorative stone
  const hasRock = rand(21) > 0.82
  const rock = useMemo(() => {
    const isLeft = rand(22) > 0.5
    return {
      x: isLeft ? -4.8 - rand(23) * 1.5 : 5.8 + rand(23) * 1.8,
      y: 0.2,
      z: (rand(25) - 0.5) * 5,
      scale: 0.52 + rand(26) * 0.35,
      rotX: rand(27) * Math.PI,
      rotY: rand(28) * Math.PI * 2,
      rotZ: rand(29) * Math.PI,
    }
  }, [seed])

  // Japanese stone shrine lantern
  const hasLantern = rand(31) > 0.82
  const lanternSide = rand(32) > 0.5 ? 1 : -1

  // Grass clusters along pathway shoulders (receiveShadow only, NO castShadow)
  const grassClusters = useMemo(() => {
    const list = []
    for (let i = 0; i < 5; i++) {
      const isLeft = i % 2 === 0
      const spreadX = rand(i * 9) * 1.4
      const x = isLeft ? -2.6 - spreadX : 2.6 + spreadX
      const z = (rand(i * 13) - 0.5) * 7.0
      const scale = 0.8 + rand(i * 7) * 0.5
      const hasFlower = rand(i * 17) > 0.65
      list.push({ x, z, scale, hasFlower, rotY: rand(i * 11) * Math.PI * 2 })
    }
    return list
  }, [seed])

  return (
    <group>
      {/* 1. Earth Strips */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[-2.45, -0.015, 0]} geometry={earthStripGeo} material={earthMat} />
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[2.45, -0.015, 0]} geometry={earthStripGeo} material={earthMat} />

      {/* 2. Moss Underbed */}
      <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} geometry={mossBedGeo} material={mossMat} />

      {/* 3. Flagstone Paving */}
      {pavingTiles.map((tile, i) => (
        <group key={`tile-${i}`} position={[tile.x, 0.03, tile.z]} rotation={[0, tile.rot, 0]}>
          <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} material={tile.isA ? tileMatA : tileMatB}>
            <planeGeometry args={[tile.w, tile.d]} />
          </mesh>
        </group>
      ))}

      {/* 4. Clustered Grass & Wildflowers (Ultra-lightweight: NO shadow-map overhead) */}
      {grassClusters.map((cluster, i) => (
        <group
          key={`grass-${i}`}
          position={[cluster.x, 0.18, cluster.z]}
          rotation={[0, cluster.rotY, 0]}
          scale={cluster.scale}
        >
          <mesh geometry={bladeGeo} material={bladeMat1} rotation={[0.08, 0, 0.15]} position={[-0.1, 0, 0]} />
          <mesh geometry={bladeGeo} scale={1.08} rotation={[0.08, 0, 0.15]} position={[-0.1, 0, 0]} material={blackMaterial} />

          <mesh geometry={bladeGeo} material={bladeMat2} rotation={[-0.12, 0.6, -0.15]} position={[0.1, 0, 0]} />
          <mesh geometry={bladeGeo} scale={1.08} rotation={[-0.12, 0.6, -0.15]} position={[0.1, 0, 0]} material={blackMaterial} />

          <mesh geometry={bladeGeo} material={bladeMat3} rotation={[0.15, -0.8, -0.05]} position={[0, -0.05, 0.12]} />

          {cluster.hasFlower && (
            <mesh position={[0, 0.35, 0]} geometry={flowerGeo} material={flowerMat} />
          )}
        </group>
      ))}

      {/* 5. Boulder */}
      {hasRock && (
        <group
          position={[rock.x, rock.y, rock.z]}
          rotation={[rock.rotX, rock.rotY, rock.rotZ]}
          scale={[rock.scale, rock.scale, rock.scale]}
        >
          <mesh castShadow receiveShadow geometry={rockGeo} material={rockMat} />
          <mesh scale={1.018} geometry={rockGeo} material={blackMaterial} />
        </group>
      )}

      {/* 6. Shrine Lantern */}
      {hasLantern && (
        <group position={[lanternSide * 3.4, 0.7, 0]} rotation={[0, lanternSide > 0 ? -0.4 : 0.4, 0]}>
          <mesh castShadow receiveShadow geometry={lanternPostGeo} material={lanternMat} />
          <mesh geometry={lanternPostGeo} scale={[1.04, 1.02, 1.04]} material={blackMaterial} />

          <mesh position={[0, 0.78, 0]} geometry={lanternChamberGeo} material={lanternChamberMat} />
          <mesh position={[0, 0.78, 0]} geometry={lanternScreenGeo} material={lanternLightMat} />

          <mesh position={[0, 1.15, 0]} rotation={[0, Math.PI / 4, 0]} geometry={lanternRoofGeo} castShadow receiveShadow material={lanternRoofMat} />
          <mesh position={[0, 1.15, 0]} rotation={[0, Math.PI / 4, 0]} scale={1.03} geometry={lanternRoofGeo} material={blackMaterial} />
        </group>
      )}
    </group>
  )
}
