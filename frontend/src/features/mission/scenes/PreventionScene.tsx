import { Float, Html, Sparkles } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef, useState } from 'react'
import * as THREE from 'three'
import { CABIN_ITEMS, partialPressure } from '../content'
import { MicroFlame } from '../three/parts'
import { Prop } from '../three/props'
import { StationCanvas } from '../three/Station'

export type BurnTest = { item: string; choice: number; safe: boolean; n: number }

type Props = {
  o2: number
  psi: number
  step: 'air' | 'materials'
  choices: Record<string, number | undefined>
  focus?: string
  test: BurnTest | null
  onPickItem: (id: string) => void
  reduced: boolean
}

const STAND: [number, number, number] = [0, -0.45, -0.75]

/** Illustrative flammability: the test flame grows with the oxygen percentage (not a simulation). */
const flameFor = (o2: number) => {
  const risk = Math.min(1, Math.max(0, (o2 - 16) / 22))
  return { size: 0.3 + risk * 0.9, heat: Math.max(0, (risk - 0.55) * 2.2) }
}

/** Appearance per item and material choice (index into CABIN_ITEMS[n].choices). */
const LOOK: Record<string, [string, string][]> = {
  clothing: [['#8fb7e8', '#3a5f8f'], ['#e9c14a', '#8a6b12']], // cotton blue, aramid gold
  stowage: [['#f2f1ec', '#b9b7ae'], ['#cfe6ff', '#7fa6cc']], // beta cloth white, plastic film
  wiring: [['#f6f6f6', '#c8c8c8'], ['#6b7280', '#3d4350']], // PTFE white, PVC grey
}

const avoid = (p: THREE.Vector3) => Math.abs(p.x) < 2.4 // keep the test area clear of floating cargo

export default function PreventionScene({ o2, psi, step, choices, focus, test, onPickItem, reduced }: Props) {
  const flame = flameFor(o2)
  return (
    <StationCanvas start={[0.35, 0.05, 0.95]} look={[0, -0.3, -0.8]} reduced={reduced} avoid={avoid} crewmate={[-3.6, 0.15, 0.4]}>
      <AtmospherePanel o2={o2} psi={psi} />
      <TestStand />
      {step === 'air' && <MicroFlame size={flame.size} heat={flame.heat} position={[STAND[0], STAND[1] + 0.55, STAND[2]]} />}
      {step === 'materials' && test && <Burn key={test.n} test={test} o2={o2} />}
      {step === 'materials' && CABIN_ITEMS.map((item, i) => (
        <Item key={item.id} id={item.id} position={[-0.75 + i * 0.75, 0.32, -0.55]} choice={choices[item.id]}
          focused={focus === item.id} onPick={onPickItem} reduced={reduced} />
      ))}
    </StationCanvas>
  )
}

/** Wall screen showing the live cabin atmosphere. */
function AtmospherePanel({ o2, psi }: { o2: number; psi: number }) {
  const pp = partialPressure(o2, psi)
  return (
    <group position={[0.95, 0.45, -1.5]}>
      <Prop name="display-wall-wide" position={[0, -0.23, -0.05]} scale={1.6} />
      <Html transform position={[0, 0.14, 0.32]} distanceFactor={0.85} className="pointer-events-none">
        <div className="w-[300px] rounded-md border border-[#6cc8ff]/40 bg-[#04121f]/90 p-3 font-mono text-[#bfe6ff] shadow-[0_0_30px_rgba(108,200,255,0.25)]">
          <p className="text-[10px] tracking-[0.18em] text-[#6cc8ff]">CABIN ATMOSPHERE</p>
          <div className="mt-2 grid grid-cols-3 gap-2 text-center">
            <Gauge label="O₂" value={`${o2}%`} pct={(o2 - 18) / 22} warn={o2 > 32} />
            <Gauge label="P" value={`${psi.toFixed(1)}`} pct={(psi - 6) / 9} warn={psi > 10.5} />
            <Gauge label="ppO₂" value={pp.toFixed(2)} pct={(pp - 2) / 2} warn={pp < 2.8 || pp > 3.6} />
          </div>
        </div>
      </Html>
    </group>
  )
}

function Gauge({ label, value, pct, warn }: { label: string; value: string; pct: number; warn: boolean }) {
  return (
    <div>
      <p className="text-[10px] text-[#6cc8ff]">{label}</p>
      <p className={`text-lg ${warn ? 'text-[#ffb36b]' : 'text-white'}`}>{value}</p>
      <div className="mt-1 h-1 rounded bg-white/10"><div className={`h-1 rounded ${warn ? 'bg-[#ffb36b]' : 'bg-[#6cc8ff]'}`} style={{ width: `${Math.max(4, Math.min(100, pct * 100))}%` }} /></div>
    </div>
  )
}

/** Flammability test stand: a clamp on a post, like a materials-test fixture. */
function TestStand() {
  return (
    <group position={STAND}>
      <mesh position={[0, -0.25, 0]}>
        <cylinderGeometry args={[0.18, 0.22, 0.08, 24]} />
        <meshStandardMaterial color="#3f4656" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.03, 0.03, 0.6, 12]} />
        <meshStandardMaterial color="#9aa3b5" metalness={0.9} roughness={0.2} />
      </mesh>
      <mesh position={[0, 0.36, 0]}>
        <boxGeometry args={[0.3, 0.03, 0.12]} />
        <meshStandardMaterial color="#5b6273" metalness={0.8} roughness={0.25} />
      </mesh>
      <mesh position={[0, 0.36, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.26, 0.006, 8, 48]} />
        <meshBasicMaterial color="#ff8a3c" toneMapped={false} />
      </mesh>
    </group>
  )
}

/**
 * Burn test of the chosen material on the stand. Unsafe materials catch and
 * keep burning and char; safe ones flare briefly and self-extinguish.
 * Illustrative timing, not test data.
 */
function Burn({ test, o2 }: { test: BurnTest; o2: number }) {
  const sample = useRef<THREE.MeshStandardMaterial>(null)
  const [t, setT] = useState(0)
  const base = useMemo(() => new THREE.Color(LOOK[test.item][test.choice][0]), [test])
  const char = useMemo(() => new THREE.Color('#1a1410'), [])
  const boost = Math.min(1.4, Math.max(0.8, o2 / 25))
  useFrame((_, dt) => {
    setT((v) => Math.min(v + dt, 5))
    if (sample.current) {
      const burnt = test.safe ? Math.min(0.25, t * 0.15) : Math.min(1, t / 3)
      sample.current.color.copy(base).lerp(char, burnt)
      sample.current.emissiveIntensity = test.safe ? Math.max(0, 0.6 - t * 0.4) : 0.4 + Math.sin(t * 20) * 0.15
    }
  })
  const size = test.safe
    ? (t < 0.5 ? t * 1.2 : Math.max(0, 0.6 - (t - 0.5) * 0.5))
    : Math.min(1.25 * boost, 0.2 + t * 0.55 * boost)
  return (
    <group position={[STAND[0], STAND[1] + 0.4, STAND[2]]}>
      <mesh>
        <boxGeometry args={[0.22, 0.04, 0.09]} />
        <meshStandardMaterial ref={sample} color={base} emissive="#ff5a1c" emissiveIntensity={0.5} roughness={0.9} />
      </mesh>
      <MicroFlame size={size} heat={test.safe ? 0 : 0.8} position={[0, 0.16, 0]} />
      {!test.safe && t > 0.8 && <Sparkles count={30} scale={[0.6, 0.6, 0.6]} position={[0, 0.2, 0]} size={3} speed={0.6} color="#ffb36b" />}
      <Html center position={[0, -0.32, 0.2]} className="pointer-events-none">
        <span className={`whitespace-nowrap rounded-full px-2.5 py-1 font-mono text-[11px] ${test.safe ? 'bg-[#0d2a1d] text-[#7dd3a7]' : 'bg-[#2e1a0a] text-[#f5a54a]'}`}>
          {t < 0.6 ? 'Igniting…' : test.safe ? 'Self-extinguished ✓' : 'Still burning ⚠'}
        </span>
      </Html>
    </group>
  )
}

function Item({ id, position, choice, focused, onPick, reduced }: {
  id: string; position: [number, number, number]; choice?: number; focused: boolean; onPick: (id: string) => void; reduced: boolean
}) {
  const [hover, setHover] = useState(false)
  const ring = useRef<THREE.Mesh>(null)
  const look = choice === undefined ? ['#9aa3b5', '#5b6273'] : LOOK[id][choice]
  const name = CABIN_ITEMS.find((i) => i.id === id)!.name
  useFrame(({ clock }) => {
    if (ring.current) {
      ring.current.rotation.z = clock.elapsedTime * 0.8
      const m = ring.current.material as THREE.MeshBasicMaterial
      m.opacity = (choice === undefined ? 0.85 : 0.35) * (0.6 + Math.sin(clock.elapsedTime * 3) * 0.4) + (hover || focused ? 0.3 : 0)
    }
  })
  return (
    <Float speed={reduced ? 0 : 1.4} rotationIntensity={reduced ? 0 : 0.5} floatIntensity={reduced ? 0 : 0.3}>
      <group position={position} scale={hover || focused ? 1.12 : 1}
        onClick={(e) => { if (e.delta > 6) return; e.stopPropagation(); onPick(id) }}
        onPointerOver={(e) => { e.stopPropagation(); setHover(true); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { setHover(false); document.body.style.cursor = '' }}>
        <group scale={0.55}>
          {id === 'clothing' && (
            <mesh rotation={[0.3, 0.5, 0.1]}>
              <boxGeometry args={[0.55, 0.12, 0.42]} />
              <meshStandardMaterial color={look[0]} roughness={0.95} />
            </mesh>
          )}
          {id === 'stowage' && (
            <group rotation={[0.2, -0.4, 0]}>
              <mesh>
                <boxGeometry args={[0.5, 0.36, 0.36]} />
                <meshPhysicalMaterial color={look[0]} roughness={choice === 1 ? 0.15 : 0.85} transmission={choice === 1 ? 0.55 : 0} thickness={0.2} />
              </mesh>
              {[-0.12, 0.12].map((x) => (
                <mesh key={x} position={[x, 0, 0]}>
                  <boxGeometry args={[0.05, 0.38, 0.38]} />
                  <meshStandardMaterial color={look[1]} roughness={0.7} />
                </mesh>
              ))}
            </group>
          )}
          {id === 'wiring' && (
            <group rotation={[0.2, 0, 0.5]}>
              {[-0.06, 0, 0.06].map((z) => (
                <mesh key={z} position={[0, 0, z]} rotation={[0, 0, Math.PI / 2]}>
                  <cylinderGeometry args={[0.035, 0.035, 0.7, 12]} />
                  <meshStandardMaterial color={look[0]} roughness={0.4} />
                </mesh>
              ))}
            </group>
          )}
          <mesh ref={ring} rotation={[Math.PI / 2, 0, 0]} position={[0, -0.28, 0]}>
            <torusGeometry args={[0.4, 0.014, 8, 48]} />
            <meshBasicMaterial color={choice === undefined ? '#6cc8ff' : '#7dd3a7'} transparent toneMapped={false} />
          </mesh>
        </group>
        {(hover || focused) && (
          <Html center position={[0, 0.3, 0]} className="pointer-events-none">
            <span className="whitespace-nowrap rounded-full bg-black/70 px-2 py-0.5 font-mono text-[11px] text-white">{name}</span>
          </Html>
        )}
      </group>
    </Float>
  )
}
