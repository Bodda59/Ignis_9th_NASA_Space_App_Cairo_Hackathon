import { Html, Sparkles } from '@react-three/drei'
import { useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import type { ActionId } from '../content'
import { Airflow, MicroFlame } from '../three/parts'
import { Prop } from '../three/props'
import { seeded } from '../three/random'
import { StationCanvas } from '../three/Station'

type Props = {
  /** 0 = small, 1 = out of control */
  size: number
  out: boolean
  powerOn: boolean
  fansOn: boolean
  spraying: boolean
  /** last action and a counter so repeated actions replay their effect */
  last: { id: ActionId; n: number } | null
  onAim: (aimed: boolean) => void
  onSwitch: (id: 'power' | 'fans') => void
  reduced: boolean
}

const RACK_Z = -1.55
const FLAME_POS = new THREE.Vector3(0, 0.05, RACK_Z + 0.32)
const avoid = (p: THREE.Vector3) => Math.abs(p.x) < 2.2

export default function SuppressionScene({ size, out, powerOn, fansOn, spraying, last, onAim, onSwitch, reduced }: Props) {
  return (
    <StationCanvas start={[0.75, 0.12, 0.5]} look={[0, 0, -1.25]} alarm={out ? 0 : 0.6 + size * 0.6} reduced={reduced}
      avoid={avoid} crewmate={[-4.2, 0.4, 0.6]} bloom={1.2}>
      <Airflow on={fansOn} count={160} speed={2.2} />
      <OpenRack powerOn={powerOn} />
      <Switch id="power" label="Rack power" on={powerOn} position={[-0.95, 0.35, RACK_Z + 0.12]} onSwitch={onSwitch} />
      <Switch id="fans" label="Cabin fans" on={fansOn} position={[-0.95, -0.25, RACK_Z + 0.12]} onSwitch={onSwitch} />
      <MicroFlame size={out ? 0 : 0.35 + size * 1.1} heat={fansOn ? 0.35 : 0} position={[FLAME_POS.x, FLAME_POS.y, FLAME_POS.z]} />
      {out && <Sparkles count={40} scale={[0.8, 0.6, 0.5]} position={[0, 0.1, RACK_Z + 0.4]} size={2} speed={0.2} color="#9aa3b5" />}
      {last && last.id !== 'co2' && <ActionEffect key={`${last.id}-${last.n}`} id={last.id} />}
      <HeldExtinguisher spraying={spraying} onAim={onAim} />
    </StationCanvas>
  )
}

/** A CO₂ extinguisher held in first person: it follows the camera and sprays where you look. */
function HeldExtinguisher({ spraying, onAim }: { spraying: boolean; onAim: (aimed: boolean) => void }) {
  const { camera } = useThree()
  const group = useRef<THREE.Group>(null)
  const aimed = useRef(false)
  const kick = useRef(0)
  const offset = useMemo(() => new THREE.Vector3(0.3, -0.26, -0.5), [])
  useFrame((_, dt) => {
    const g = group.current
    if (!g) return
    kick.current += ((spraying ? 1 : 0) - kick.current) * Math.min(1, dt * 10)
    const o = offset.clone()
    o.z += kick.current * 0.03
    o.applyQuaternion(camera.quaternion)
    g.position.copy(camera.position).add(o)
    g.quaternion.copy(camera.quaternion)
    // aiming: is the crosshair on the flame, and are we close enough to reach it?
    const forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion)
    const to = FLAME_POS.clone().sub(camera.position)
    const dist = to.length()
    // ~20° cone and 3.2 m reach: forgiving enough after clicking switches nudges the view
    const onTarget = forward.angleTo(to.normalize()) < 0.35 && dist < 3.2
    if (onTarget !== aimed.current) { aimed.current = onTarget; onAim(onTarget) }
  })
  return (
    <group ref={group}>
      <group rotation={[0.08, -0.15, 0]}>
        {/* bottle */}
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.055, 0.055, 0.34, 24]} />
          <meshStandardMaterial color="#c8102e" metalness={0.35} roughness={0.35} />
        </mesh>
        <mesh position={[0, 0, -0.02]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.057, 0.057, 0.06, 24]} />
          <meshStandardMaterial color="#f2f2f2" roughness={0.4} />
        </mesh>
        {/* valve, handle and horn */}
        <mesh position={[0, 0.01, -0.19]}>
          <boxGeometry args={[0.05, 0.05, 0.05]} />
          <meshStandardMaterial color="#2b2f38" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.05, -0.17]} rotation={[0.4, 0, 0]}>
          <boxGeometry args={[0.02, 0.012, 0.12]} />
          <meshStandardMaterial color="#1b1e25" metalness={0.6} roughness={0.3} />
        </mesh>
        <mesh position={[0, 0.0, -0.27]} rotation={[-Math.PI / 2, 0, 0]}>
          <coneGeometry args={[0.035, 0.12, 16, 1, true]} />
          <meshStandardMaterial color="#1b1e25" metalness={0.4} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
        <Html transform position={[0.058, 0, 0.02]} rotation={[0, Math.PI / 2, 0]} distanceFactor={0.25} className="pointer-events-none">
          <span className="font-mono text-[11px] font-bold text-white">CO₂</span>
        </Html>
      </group>
      <Spray active={spraying} />
    </group>
  )
}

/** CO₂ cloud leaving the horn along the view direction (particles in the extinguisher's frame). */
function Spray({ active }: { active: boolean }) {
  const count = 260
  const points = useRef<THREE.Points>(null)
  const mat = useRef<THREE.PointsMaterial>(null)
  const seeds = useMemo(() => {
    const r = seeded(3)
    return Array.from({ length: count }, () => ({ phase: r(), dx: (r() - 0.5), dy: (r() - 0.5) }))
  }, [])
  const positions = useMemo(() => new Float32Array(count * 3), [])
  const t = useRef(0)
  const level = useRef(0)
  useFrame((_, dt) => {
    t.current += dt
    level.current += ((active ? 1 : 0) - level.current) * Math.min(1, dt * 6)
    const p = points.current
    if (!p) return
    const arr = p.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      const s = seeds[i]
      const age = (t.current * 1.8 + s.phase) % 1 // 0..1 along the jet
      const reach = age * 2.4
      const spread = 0.02 + age * 0.45
      arr[i * 3] = s.dx * spread
      arr[i * 3 + 1] = s.dy * spread
      arr[i * 3 + 2] = -0.33 - reach
    }
    p.geometry.attributes.position.needsUpdate = true
    if (mat.current) mat.current.opacity = level.current * 0.75
  })
  return (
    <points ref={points} frustumCulled={false} rotation={[0.08, -0.15, 0]}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={mat} color="#f2f6ff" size={0.08} transparent opacity={0} depthWrite={false} sizeAttenuation />
    </points>
  )
}

/** Big toggle on the rack face: glows when on; click to switch off. */
function Switch({ id, label, on, position, onSwitch }: {
  id: 'power' | 'fans'; label: string; on: boolean; position: [number, number, number]; onSwitch: (id: 'power' | 'fans') => void
}) {
  const [hover, setHover] = useState(false)
  const plate = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (plate.current) plate.current.emissiveIntensity = on ? 1.2 + Math.sin(clock.elapsedTime * 4) * 0.5 + (hover ? 0.8 : 0) : 0.15
  })
  return (
    <group position={position}
      onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); onSwitch(id) }}
      onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}>
      <mesh>
        <boxGeometry args={[0.36, 0.26, 0.03]} />
        <meshStandardMaterial ref={plate} color={on ? '#ffb36b' : '#2a2f3a'} emissive={on ? '#ff7a2c' : '#000'} toneMapped={false} />
      </mesh>
      <group position={[0, -0.04, 0.02]} rotation={[on ? -0.5 : 0.5, 0, 0]}>
        <Prop name="wall-switch" position={[0, 0, 0]} scale={1.3} />
      </group>
      <Html center position={[0, 0.2, 0.05]} className="pointer-events-none">
        <span className={`whitespace-nowrap rounded px-1.5 py-0.5 font-mono text-[10px] ${on ? 'bg-[#ff7a2c] text-black' : 'bg-[#1b2a1f] text-[#7dd3a7]'}`}>
          {label}: {on ? 'ON' : 'OFF'}
        </span>
      </Html>
    </group>
  )
}

/** Equipment rack with its front panel swung open and an overheating circuit board. */
function OpenRack({ powerOn }: { powerOn: boolean }) {
  const spark = useRef<THREE.MeshStandardMaterial>(null)
  useFrame(({ clock }) => {
    if (spark.current) spark.current.emissiveIntensity = powerOn ? 2.5 + Math.abs(Math.sin(clock.elapsedTime * 17)) * 5 : 0.05
  })
  return (
    <group position={[0, 0, RACK_Z]}>
      <mesh position={[0, 0.05, 0.12]}>
        <boxGeometry args={[1.3, 1.0, 0.04]} />
        <meshStandardMaterial color="#1a1e29" roughness={0.9} />
      </mesh>
      {[-0.35, 0, 0.35].map((x, i) => (
        <group key={x} position={[x, 0.05, 0.2]}>
          <mesh>
            <boxGeometry args={[0.28, 0.7, 0.03]} />
            <meshStandardMaterial color={i === 1 ? '#2f4d2a' : '#24402a'} roughness={0.6} />
          </mesh>
          {[-0.2, 0, 0.2].map((y) => (
            <mesh key={y} position={[0, y, 0.025]}>
              <boxGeometry args={[0.12, 0.08, 0.025]} />
              <meshStandardMaterial color="#111" metalness={0.4} roughness={0.4} />
            </mesh>
          ))}
        </group>
      ))}
      <mesh position={[0, -0.15, 0.25]}>
        <boxGeometry args={[0.14, 0.1, 0.05]} />
        <meshStandardMaterial ref={spark} color="#ff8a3c" emissive="#ff6a1c" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      <group position={[0.68, 0.05, 0.16]} rotation={[0, -1.2, 0]}>
        <mesh position={[0.62, 0, 0]}>
          <boxGeometry args={[1.25, 0.95, 0.04]} />
          <meshStandardMaterial color="#e4e6ec" roughness={0.55} />
        </mesh>
      </group>
    </group>
  )
}

function ActionEffect({ id }: { id: ActionId }) {
  if (id === 'water') return <WaterBlobs />
  if (id === 'blow') return <Sparkles count={60} scale={[0.9, 0.7, 0.6]} position={[FLAME_POS.x, FLAME_POS.y, FLAME_POS.z + 0.2]} size={4} speed={2} color="#9fd4ff" />
  return null
}

/** In microgravity, squirted water breaks into floating blobs instead of falling. */
function WaterBlobs() {
  const group = useRef<THREE.Group>(null)
  const blobs = useMemo(() => {
    const r = seeded(9)
    return Array.from({ length: 9 }, () => ({
      p: new THREE.Vector3((r() - 0.5) * 0.9, (r() - 0.5) * 0.6, RACK_Z + 0.5 + r() * 0.5),
      v: new THREE.Vector3((r() - 0.5) * 0.08, (r() - 0.5) * 0.08, (r() - 0.5) * 0.04),
      r: 0.03 + r() * 0.06,
    }))
  }, [])
  useFrame(({ clock }, dt) => {
    const g = group.current
    if (!g) return
    g.children.forEach((m, i) => {
      const b = blobs[i]
      b.p.addScaledVector(b.v, dt)
      m.position.copy(b.p)
      const wob = 1 + Math.sin(clock.elapsedTime * 3 + i) * 0.08
      m.scale.set(wob, 2 - wob, wob)
    })
  })
  return (
    <group ref={group}>
      {blobs.map((b, i) => (
        <mesh key={i} position={b.p}>
          <sphereGeometry args={[b.r, 20, 16]} />
          <meshPhysicalMaterial color="#cfe9ff" transmission={0.9} roughness={0.05} thickness={0.3} ior={1.33} />
        </mesh>
      ))}
    </group>
  )
}
