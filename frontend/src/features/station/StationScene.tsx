import { Float, Html, OrbitControls, Stars } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { createContext, useContext, useEffect, useMemo, useRef, type ReactNode, type RefObject } from 'react'
import * as THREE from 'three'
import type { RackId } from './racks'

/**
 * Stylised, ISS-like station built from primitives. Illustrative only —
 * not to scale, and rack positions are schematic.
 */
/** `active` false draws once then pauses (scene stays built) while it is scrolled off screen. */
type Props = { selected: RackId | null; onSelect: (id: RackId) => void; reduced: boolean; active?: boolean }

/**
 * Fixed container for the rack labels. Without it, drei's <Html> attaches labels to the
 * canvas parent and then moves them once pointer events connect; under React 19 that
 * rebuild can leave a label empty (the CIR label disappeared this way).
 */
const LabelLayer = createContext<RefObject<HTMLElement> | null>(null)

export default function StationScene({ selected, onSelect, reduced, active = true }: Props) {
  const labels = useRef<HTMLDivElement>(null!)
  return (
    <div ref={labels} className="relative h-full w-full">
    <LabelLayer.Provider value={labels}>
    <Canvas frameloop={active ? 'always' : 'demand'} camera={{ position: [5.2, 2.6, 6.2], fov: 38 }} dpr={[1, 2]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={0.35} />
      <directionalLight position={[6, 5, 4]} intensity={2.2} color="#fff1dc" />
      <directionalLight position={[-6, -2, -4]} intensity={0.9} color="#6cc8ff" />
      <Stars radius={60} depth={30} count={1400} factor={2.2} saturation={0} fade speed={reduced ? 0 : 0.4} />
      <Float speed={reduced ? 0 : 1.1} rotationIntensity={reduced ? 0 : 0.15} floatIntensity={reduced ? 0 : 0.4}>
        <FaceSelected selected={selected} reduced={reduced}>
          <Station selected={selected} onSelect={onSelect} />
        </FaceSelected>
      </Float>
      {/* Auto-rotate until a rack is picked, so the picked rack stays in view. */}
      <OrbitControls enableZoom={false} enablePan={false} autoRotate={!reduced && !selected} autoRotateSpeed={0.45} enableDamping minPolarAngle={0.6} maxPolarAngle={2.3} />
    </Canvas>
    </LabelLayer.Provider>
    </div>
  )
}

/** Hotspot positions around the station's vertical axis (x, z), used to turn a rack toward the viewer. */
const RACK_XZ: Record<RackId, [number, number]> = { cir: [0, -1.3], msg: [0, 1.25] }

/** When a rack is selected, smoothly turns the station so that rack faces the camera. */
function FaceSelected({ selected, reduced, children }: { selected: RackId | null; reduced: boolean; children: ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const target = useRef<number | null>(null)
  const { camera } = useThree()

  useEffect(() => {
    if (!selected || !group.current) return
    const [x, z] = RACK_XZ[selected]
    // Rotating by θ moves a point's azimuth from φ to φ + θ; aim it at the camera's azimuth.
    const want = Math.atan2(camera.position.x, camera.position.z) - Math.atan2(x, z)
    const now = group.current.rotation.y
    // Take the shortest way round.
    target.current = now + Math.atan2(Math.sin(want - now), Math.cos(want - now))
    if (reduced) group.current.rotation.y = target.current
  }, [selected, camera, reduced])

  useFrame((_, dt) => {
    const g = group.current
    if (!g || target.current === null) return
    const diff = target.current - g.rotation.y
    if (Math.abs(diff) < 0.001) { target.current = null; return }
    g.rotation.y += diff * Math.min(1, dt * 4)
  })

  return <group ref={group}>{children}</group>
}

function useSolarTexture() {
  return useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 256
    c.height = 512
    const g = c.getContext('2d')!
    g.fillStyle = '#16264a'
    g.fillRect(0, 0, 256, 512)
    for (let y = 0; y < 16; y++)
      for (let x = 0; x < 4; x++) {
        const grd = g.createLinearGradient(0, y * 32, 0, y * 32 + 30)
        grd.addColorStop(0, '#3b6fd1')
        grd.addColorStop(1, '#22479a')
        g.fillStyle = grd
        g.fillRect(x * 64 + 3, y * 32 + 2, 58, 28)
      }
    g.strokeStyle = 'rgba(214,170,90,0.55)'
    g.lineWidth = 2
    g.strokeRect(1, 1, 254, 510)
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.anisotropy = 4
    return t
  }, [])
}

const WHITE = new THREE.MeshStandardMaterial({ color: '#dfe3ec', metalness: 0.35, roughness: 0.45 })
const TRUSS = new THREE.MeshStandardMaterial({ color: '#8a90a0', metalness: 0.75, roughness: 0.35 })
const RADIATOR = new THREE.MeshStandardMaterial({ color: '#f2f3f6', metalness: 0.1, roughness: 0.8, side: THREE.DoubleSide })

function Station({ selected, onSelect }: { selected: RackId | null; onSelect: (id: RackId) => void }) {
  const solar = useSolarTexture()
  const panel = useMemo(() => new THREE.MeshStandardMaterial({ map: solar, metalness: 0.55, roughness: 0.35, side: THREE.DoubleSide, emissive: '#1a3470', emissiveIntensity: 0.55 }), [solar])
  const arrays = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    // arrays slowly track the "sun"
    if (arrays.current) arrays.current.children.forEach((c) => (c.rotation.x += dt * 0.08))
  })

  return (
    <group rotation={[0.08, 0, 0]}>
      {/* main truss */}
      <mesh material={TRUSS}>
        <boxGeometry args={[7.2, 0.16, 0.16]} />
      </mesh>
      {[-3.3, -2.4, 2.4, 3.3].map((x) => (
        <mesh key={x} position={[x, 0, 0]} material={TRUSS}>
          <boxGeometry args={[0.22, 0.3, 0.3]} />
        </mesh>
      ))}

      {/* solar array wings */}
      <group ref={arrays}>
        {[-3.3, -2.4, 2.4, 3.3].map((x) => (
          <group key={x} position={[x, 0, 0]}>
            <mesh position={[0, 1.05, 0]} material={panel}>
              <boxGeometry args={[0.62, 1.8, 0.02]} />
            </mesh>
            <mesh position={[0, -1.05, 0]} material={panel}>
              <boxGeometry args={[0.62, 1.8, 0.02]} />
            </mesh>
          </group>
        ))}
      </group>

      {/* radiators */}
      {[-1.25, 1.25].map((x) => (
        <mesh key={x} position={[x, -0.55, 0]} rotation={[0, 0, 0]} material={RADIATOR}>
          <planeGeometry args={[0.5, 0.9]} />
        </mesh>
      ))}

      {/* pressurised modules (perpendicular to truss) */}
      <group position={[0, -0.32, 0]}>
        <Module z={-1.3} length={1.1} />
        <mesh position={[0, 0, -0.55]} material={WHITE}>
          <sphereGeometry args={[0.27, 24, 16]} />
        </mesh>
        <Module z={0.05} length={1.0} />
        <mesh position={[0, 0, 0.62]} material={WHITE}>
          <sphereGeometry args={[0.27, 24, 16]} />
        </mesh>
        <Module z={1.25} length={1.0} />
        <Module z={0.62} x={0.62} length={0.75} sideways />

        <Hotspot id="cir" label="CIR" position={[0, 0.3, -1.3]} selected={selected === 'cir'} onSelect={onSelect} />
        <Hotspot id="msg" label="MSG" position={[0, 0.3, 1.25]} selected={selected === 'msg'} onSelect={onSelect} />
      </group>
    </group>
  )
}

function Module({ z, x = 0, length, sideways }: { z: number; x?: number; length: number; sideways?: boolean }) {
  return (
    <group position={[x, 0, z]} rotation={sideways ? [0, 0, Math.PI / 2] : [Math.PI / 2, 0, 0]}>
      <mesh material={WHITE}>
        <cylinderGeometry args={[0.24, 0.24, length, 28]} />
      </mesh>
      {[-0.32, 0, 0.32].map((o) => (
        <mesh key={o} position={[0, o * length, 0]} material={TRUSS}>
          <torusGeometry args={[0.245, 0.012, 8, 32]} />
        </mesh>
      ))}
    </group>
  )
}

function Hotspot({ id, label, position, selected, onSelect }: { id: RackId; label: string; position: [number, number, number]; selected: boolean; onSelect: (id: RackId) => void }) {
  const layer = useContext(LabelLayer)
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.05, 16, 16]} />
        <meshBasicMaterial color={selected ? '#6cc8ff' : '#f5a54a'} />
      </mesh>
      <Html center distanceFactor={6.5} zIndexRange={[20, 0]} portal={layer ?? undefined}>
        <button
          onClick={() => onSelect(id)}
          aria-pressed={selected}
          aria-label={`Show experiments in the ${label}`}
          className={`group relative grid h-9 w-9 place-items-center rounded-full ${selected ? 'text-[#08090e]' : 'text-[#e2e5ed]'}`}
        >
          <span className={`absolute inset-0 rounded-full ${selected ? 'bg-[#6cc8ff]' : 'animate-ping bg-[#f5a54a]/40'}`} />
          <span className={`relative rounded-full px-2 py-0.5 font-mono text-[11px] font-semibold tracking-[0.08em] ${selected ? 'bg-[#6cc8ff]' : 'bg-[#08090e]/80 ring-1 ring-[#f5a54a]'}`}>
            {label}
          </span>
        </button>
      </Html>
    </group>
  )
}
