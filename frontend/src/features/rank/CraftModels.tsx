import { useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'

/**
 * Small craft and bases for the Rank hero, built from primitives.
 * Each model is about 0.2 scene units (Earth radius = 1), far larger than real scale.
 */

const WHITE = new THREE.MeshStandardMaterial({ color: '#e6e9f2', metalness: 0.3, roughness: 0.45 })
const GREY = new THREE.MeshStandardMaterial({ color: '#8a90a0', metalness: 0.7, roughness: 0.35 })
const PANEL = new THREE.MeshStandardMaterial({ color: '#2a56c6', metalness: 0.6, roughness: 0.3, emissive: '#16306e', emissiveIntensity: 0.6, side: THREE.DoubleSide })
const GOLD = new THREE.MeshStandardMaterial({ color: '#d9a441', metalness: 0.8, roughness: 0.3 })
const GLASS = new THREE.MeshStandardMaterial({ color: '#6cc8ff', metalness: 0.2, roughness: 0.1, emissive: '#2f6bff', emissiveIntensity: 0.5 })
const TYRE = new THREE.MeshStandardMaterial({ color: '#2b2f3a', roughness: 0.9 })

/** Blinking beacon light. */
function Beacon({ position, color = '#ff6b6b', speed = 1.6 }: { position: [number, number, number]; color?: string; speed?: number }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = 0.35 + 0.65 * Math.max(0, Math.sin(clock.elapsedTime * speed * Math.PI))
  })
  return (
    <mesh position={position}>
      <sphereGeometry args={[0.008, 10, 10]} />
      <meshBasicMaterial ref={mat} color={color} transparent />
    </mesh>
  )
}

/** ISS-like station: truss, modules and four solar wings that slowly track the sun. */
export function StationModel({ reduced }: { reduced: boolean }) {
  const wings = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (!reduced && wings.current) wings.current.children.forEach((c) => { c.rotation.x += Math.min(dt, 0.05) * 0.3 })
  })
  return (
    <group scale={0.9}>
      <mesh material={GREY}><boxGeometry args={[0.34, 0.012, 0.012]} /></mesh>
      <mesh material={WHITE} rotation={[Math.PI / 2, 0, 0]}><cylinderGeometry args={[0.018, 0.018, 0.12, 16]} /></mesh>
      <mesh material={WHITE} position={[0, 0, 0.07]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.016, 0.016, 0.08, 16]} /></mesh>
      <group ref={wings}>
        {[-0.15, -0.1, 0.1, 0.15].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh material={PANEL} position={[0, 0.055, 0]}><boxGeometry args={[0.035, 0.1, 0.002]} /></mesh>
            <mesh material={PANEL} position={[0, -0.055, 0]}><boxGeometry args={[0.035, 0.1, 0.002]} /></mesh>
          </group>
        ))}
      </group>
      <Beacon position={[0, 0.022, 0]} color="#7dd3a7" />
    </group>
  )
}

/** Orion-style crew capsule with its service module, solar wings and a faint engine glow. */
export function CapsuleModel({ reduced }: { reduced: boolean }) {
  const glow = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (glow.current) glow.current.opacity = reduced ? 0.5 : 0.35 + 0.25 * Math.sin(clock.elapsedTime * 9)
  })
  return (
    <group rotation={[0, 0, -Math.PI / 2]} scale={1.1}>
      {/* crew module (cone) */}
      <mesh material={WHITE} position={[0, 0.05, 0]}><coneGeometry args={[0.035, 0.05, 24]} /></mesh>
      <mesh material={GLASS} position={[0.017, 0.048, 0.016]}><sphereGeometry args={[0.006, 8, 8]} /></mesh>
      {/* service module */}
      <mesh material={GOLD} position={[0, 0.0, 0]}><cylinderGeometry args={[0.032, 0.032, 0.05, 24]} /></mesh>
      <mesh material={GREY} position={[0, -0.034, 0]}><coneGeometry args={[0.016, 0.02, 16]} /></mesh>
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} material={PANEL} position={[Math.cos((i * Math.PI) / 2) * 0.065, 0, Math.sin((i * Math.PI) / 2) * 0.065]} rotation={[0, -(i * Math.PI) / 2, 0]}>
          <boxGeometry args={[0.07, 0.022, 0.002]} />
        </mesh>
      ))}
      <mesh position={[0, -0.06, 0]}>
        <coneGeometry args={[0.014, 0.05, 16]} />
        <meshBasicMaterial ref={glow} color="#6cc8ff" transparent opacity={0.5} />
      </mesh>
    </group>
  )
}

/** Dome habitat with a connecting module, antenna and solar panel. */
export function BaseModel({ tint = '#e6e9f2', scale = 1 }: { tint?: string; scale?: number }) {
  return (
    <group scale={scale}>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[0.05, 24, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color={tint} metalness={0.25} roughness={0.5} />
      </mesh>
      <mesh material={GLASS} position={[0, 0.018, 0.04]}><boxGeometry args={[0.03, 0.012, 0.012]} /></mesh>
      <mesh material={WHITE} position={[0.065, 0.014, 0]} rotation={[0, 0, Math.PI / 2]}><cylinderGeometry args={[0.014, 0.014, 0.05, 16]} /></mesh>
      <mesh material={GREY} position={[-0.055, 0.04, 0]}><cylinderGeometry args={[0.0025, 0.0025, 0.08, 6]} /></mesh>
      <mesh material={PANEL} position={[0.09, 0.04, 0]} rotation={[0, 0, 0.5]}><boxGeometry args={[0.05, 0.03, 0.002]} /></mesh>
      <Beacon position={[-0.055, 0.082, 0]} />
    </group>
  )
}

/** Six-wheeled pressurized rover with a cabin window and a sweeping antenna. */
export function RoverModel({ reduced }: { reduced: boolean }) {
  const dish = useRef<THREE.Group>(null)
  useFrame(({ clock }) => {
    if (dish.current && !reduced) dish.current.rotation.y = Math.sin(clock.elapsedTime * 0.8) * 0.8
  })
  return (
    <group scale={0.95}>
      <mesh position={[0, 0.03, 0]}><boxGeometry args={[0.11, 0.035, 0.05]} /><meshStandardMaterial color="#f2f3f6" metalness={0.3} roughness={0.5} /></mesh>
      <mesh material={GLASS} position={[0.048, 0.036, 0]}><boxGeometry args={[0.018, 0.022, 0.044]} /></mesh>
      <mesh material={PANEL} position={[-0.015, 0.05, 0]}><boxGeometry args={[0.07, 0.003, 0.046]} /></mesh>
      {[-0.038, 0, 0.038].flatMap((x) => [0.03, -0.03].map((z) => (
        <mesh key={`${x}${z}`} material={TYRE} position={[x, 0.01, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.013, 0.013, 0.01, 14]} />
        </mesh>
      )))}
      <group ref={dish} position={[-0.04, 0.05, 0]}>
        <mesh material={GREY} position={[0, 0.02, 0]}><cylinderGeometry args={[0.002, 0.002, 0.04, 6]} /></mesh>
        <mesh material={WHITE} position={[0.006, 0.042, 0]} rotation={[0, 0, -1.1]}>
          <coneGeometry args={[0.012, 0.006, 16, 1, true]} />
        </mesh>
      </group>
      <Beacon position={[0.05, 0.052, 0]} color="#ffcf4a" speed={2.2} />
    </group>
  )
}
