import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { seeded } from '../three/random'
import { AIR_SPEED, DUST, RACK_X, SLOTS, type Slot } from '../content'
import { Airflow } from '../three/parts'
import { StationCanvas } from '../three/Station'

// floating cargo stays on the starboard side, clear of the smoke path and detector spots
const avoid = (p: THREE.Vector3) => p.z < 0.3 || Math.abs(p.x) > 5.4

type Props = {
  source: number
  placed: string[]
  phase: 'place' | 'run' | 'done'
  /** seconds since the run started (drives the smoke) */
  clock: number
  alarms: Record<string, 'smoke' | 'dust'>
  onSlot: (id: string) => void
  reduced: boolean
}

export default function DetectionScene({ source, placed, phase, clock, alarms, onSlot, reduced }: Props) {
  const anyAlarm = Object.values(alarms).includes('smoke') ? 1 : 0
  return (
    <StationCanvas start={[-5.7, 0.4, 0.95]} look={[0.8, -0.15, -1.35]} alarm={anyAlarm} reduced={reduced} avoid={avoid}
      crewmate={[4.4, 0.55, 0.95]} bloom={1.1}>
      <Airflow on={phase !== 'place'} count={180} speed={AIR_SPEED * 1.6} />
      <FanAndVent running={phase !== 'place'} />
      {phase !== 'place' && <HotRack x={RACK_X[source]} reveal={phase === 'done' ? 1 : 0.35} />}
      <Plume active={phase !== 'place'} clock={clock} x0={RACK_X[source]} z0={-1.45} color="#c7ccd6" count={420} spawnUntil={60} />
      <Plume active={phase !== 'place' && clock >= DUST.start} clock={clock - DUST.start} x0={DUST.x} z0={-1.35} y0={-1.1}
        color="#c9a36a" count={140} spawnUntil={1.2} />
      {SLOTS.map((s) => (
        <SlotMarker key={s.id} slot={s} placed={placed.includes(s.id)} alarm={alarms[s.id]} interactive={phase === 'place'} onSlot={onSlot} />
      ))}
    </StationCanvas>
  )
}

/** Fan grille upstream, return-air vent downstream. */
function FanAndVent({ running }: { running: boolean }) {
  const blades = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (blades.current && running) blades.current.rotation.x += dt * 9
  })
  return (
    <group>
      <group position={[-6.75, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
        <mesh>
          <ringGeometry args={[0.42, 0.5, 40]} />
          <meshStandardMaterial color="#aab1c0" metalness={0.7} roughness={0.3} side={THREE.DoubleSide} />
        </mesh>
      </group>
      <group ref={blades} position={[-6.72, 0, 0]}>
        {[0, 1, 2, 3].map((i) => (
          <mesh key={i} rotation={[(i * Math.PI) / 2, 0, 0]} position={[0, 0, 0]}>
            <boxGeometry args={[0.02, 0.4, 0.1]} />
            <meshStandardMaterial color="#d6dbe4" metalness={0.6} roughness={0.3} />
          </mesh>
        ))}
      </group>
      <group position={[6.75, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        {[-0.3, -0.15, 0, 0.15, 0.3].map((y) => (
          <mesh key={y} position={[0, y, 0]}>
            <boxGeometry args={[0.9, 0.05, 0.04]} />
            <meshStandardMaterial color="#5b6273" metalness={0.6} roughness={0.4} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

/** The overheating part: a dim glow while running, fully revealed at the end. */
function HotRack({ x, reveal }: { x: number; reveal: number }) {
  const mat = useRef<THREE.MeshBasicMaterial>(null)
  useFrame(({ clock }) => {
    if (mat.current) mat.current.opacity = reveal * (0.45 + Math.sin(clock.elapsedTime * 4) * 0.15)
  })
  return (
    <group position={[x, 0.15, -1.58]}>
      <mesh>
        <planeGeometry args={[1.6, 0.55]} />
        <meshBasicMaterial ref={mat} color="#ff6a2c" transparent opacity={0} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      {reveal >= 1 && (
        <Html center position={[0, 0.55, 0.1]} className="pointer-events-none">
          <span className="whitespace-nowrap rounded-full bg-[var(--color-ember)] px-2 py-0.5 font-mono text-[11px] text-[var(--color-void)]">Overheating part</span>
        </Html>
      )}
    </group>
  )
}

/**
 * Smoke / dust particles: carried downstream at the air speed and spreading
 * sideways with distance. No buoyancy, so nothing drifts "up" on its own.
 */
function Plume({ active, clock, x0, z0, y0 = 0.1, color, count, spawnUntil }: {
  active: boolean; clock: number; x0: number; z0: number; y0?: number; color: string; count: number; spawnUntil: number
}) {
  const points = useRef<THREE.Points>(null)
  const seeds = useMemo(() => { const r = seeded(count + Math.round(x0 * 100)); return Array.from({ length: count }, () => ({
    born: r() * spawnUntil, ry: (r() - 0.5) * 2, rz: r(), jitter: r() * Math.PI * 2,
  })) }, [count, spawnUntil, x0])
  const positions = useMemo(() => new Float32Array(count * 3).fill(999), [count])
  const mat = useRef<THREE.PointsMaterial>(null)
  useFrame(({ clock: c }) => {
    const p = points.current
    if (!p) return
    const arr = p.geometry.attributes.position.array as Float32Array
    for (let i = 0; i < count; i++) {
      const s = seeds[i]
      const age = clock - s.born
      if (!active || age < 0) { arr[i * 3] = 999; continue }
      const dx = Math.min(age * AIR_SPEED, 6.6 - x0)
      const spread = 0.35 + dx * 0.32
      arr[i * 3] = x0 + dx
      arr[i * 3 + 1] = y0 + s.ry * spread * 0.8 + Math.sin(c.elapsedTime + s.jitter) * 0.03
      arr[i * 3 + 2] = Math.min(1.5, z0 + s.rz * spread * 1.2)
    }
    p.geometry.attributes.position.needsUpdate = true
    if (mat.current) mat.current.opacity = active ? 0.7 : 0
  })
  return (
    <points ref={points} frustumCulled={false}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={mat} color={color} size={0.09} transparent opacity={0} depthWrite={false} sizeAttenuation />
    </points>
  )
}

function SlotMarker({ slot, placed, alarm, interactive, onSlot }: {
  slot: Slot; placed: boolean; alarm?: 'smoke' | 'dust'; interactive: boolean; onSlot: (id: string) => void
}) {
  const [hover, setHover] = useState(false)
  const led = useRef<THREE.MeshStandardMaterial>(null)
  const ring = useRef<THREE.Mesh>(null)
  useFrame(({ clock }) => {
    const t = clock.elapsedTime
    if (led.current) {
      const on = alarm ? Math.abs(Math.sin(t * 7)) : 0.25
      led.current.emissiveIntensity = alarm ? 2 + on * 6 : 1.2
    }
    if (ring.current) {
      ring.current.visible = interactive && !placed
      ring.current.scale.setScalar(1 + Math.sin(t * 3) * 0.08 + (hover ? 0.2 : 0))
    }
  })
  // orient the marker flat against its surface
  const rot: [number, number, number] = slot.kind === 'ceiling' ? [Math.PI / 2, 0, 0] : slot.kind === 'vent' ? [0, -Math.PI / 2, 0] : [0, 0, 0]
  const ledColor = alarm === 'dust' ? '#f5a54a' : alarm ? '#ff4b3a' : '#7dd3a7'
  return (
    <group position={[slot.x, slot.y, slot.z]} rotation={rot}
      onClick={(e) => { if (!interactive || e.delta > 6) return; e.stopPropagation(); onSlot(slot.id) }}
      onPointerOver={(e) => { if (!interactive) return; e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
      onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}>
      <mesh ref={ring} position={[0, 0, 0.06]}>
        <torusGeometry args={[0.24, 0.018, 8, 40]} />
        <meshBasicMaterial color={hover ? '#ffffff' : '#6cc8ff'} toneMapped={false} />
      </mesh>
      {/* transparent hit area (visible={false} meshes don't receive pointer events) */}
      <mesh>
        <circleGeometry args={[0.36, 20]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} side={THREE.DoubleSide} />
      </mesh>
      {placed && (
        <group position={[0, 0, 0.05]}>
          <mesh rotation={[Math.PI / 2, 0, 0]}>
            <cylinderGeometry args={[0.17, 0.19, 0.08, 28]} />
            <meshStandardMaterial color="#eef1f6" roughness={0.4} />
          </mesh>
          <mesh position={[0, 0, 0.05]}>
            <sphereGeometry args={[0.035, 12, 12]} />
            <meshStandardMaterial ref={led} color={ledColor} emissive={ledColor} emissiveIntensity={1.2} toneMapped={false} />
          </mesh>
        </group>
      )}
      {(hover || alarm) && (
        <Html center position={[0, 0.42, 0.1]} className="pointer-events-none">
          <span className={`whitespace-nowrap rounded-full px-2 py-0.5 font-mono text-[11px] ${alarm === 'smoke' ? 'bg-[#ff4b3a] text-white' : alarm === 'dust' ? 'bg-[var(--color-ember)] text-[var(--color-void)]' : 'bg-[var(--color-panel)] text-[var(--color-ink)]'}`}>
            {alarm === 'smoke' ? 'SMOKE ALARM' : alarm === 'dust' ? 'False alarm: dust' : slot.label}
          </span>
        </Html>
      )}
    </group>
  )
}
