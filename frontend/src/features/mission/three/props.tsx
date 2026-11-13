import { Center, Float, RoundedBox, useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { seeded } from './random'

/**
 * Station set dressing.
 * Props: Kenney "Space Station Kit" (CC0, www.kenney.nl), in /models/kenney/.
 * Crewmate: "Astronaut" by PW Wu, CC-BY 3.0 via Poly Pizza (credited in the UI).
 */
const KIT = ['computer', 'computer-screen', 'computer-wide', 'container', 'container-tall', 'container-flat',
  'display-wall', 'display-wall-wide', 'pipe', 'pipe-ring-colored', 'pipe-bend', 'wall-switch'] as const
type KitName = (typeof KIT)[number]
const url = (n: KitName) => `/models/kenney/${n}.glb`

type Vec3 = [number, number, number]

export function Prop({ name, position, rotation = [0, 0, 0], scale = 1 }: { name: KitName; position: Vec3; rotation?: Vec3; scale?: number }) {
  const { scene } = useGLTF(url(name))
  const model = useMemo(() => scene.clone(true), [scene])
  return <primitive object={model} position={position} rotation={rotation} scale={scale} />
}

/** Props fixed to the module walls; none sit in front of the detector spots used in level 2. */
export function StationDressing() {
  const pipes: { p: Vec3; r: Vec3 }[] = []
  for (let x = -6; x <= 6; x += 0.5) {
    pipes.push({ p: [x, 1.42, 1.28], r: [0, 0, -Math.PI / 2] })
    pipes.push({ p: [x, 1.42, -1.28], r: [0, 0, -Math.PI / 2] })
  }
  return (
    <group>
      {/* starboard wall (z = +1.7), facing the crew */}
      <Prop name="computer-screen" position={[-3.45, -0.25, 1.38]} rotation={[0, Math.PI, 0]} />
      <Prop name="computer-wide" position={[3.45, -0.3, 1.36]} rotation={[0, Math.PI, 0]} />
      <Prop name="display-wall-wide" position={[1.15, 0.55, 1.52]} rotation={[0, Math.PI, 0]} />
      <Prop name="display-wall" position={[-5.75, 0.5, 1.52]} rotation={[0, Math.PI, 0]} />
      <Prop name="computer" position={[5.75, -0.4, 1.4]} rotation={[0, Math.PI, 0]} />
      {/* deck (y = -1.7): strapped-down cargo */}
      <Prop name="container-tall" position={[-2.3, -1.66, 0.85]} />
      <Prop name="container" position={[-1.6, -1.66, 1.05]} rotation={[0, 0.4, 0]} />
      <Prop name="container-flat" position={[4.6, -1.66, 0.75]} rotation={[0, Math.PI / 2, 0]} />
      <Prop name="container" position={[-5.0, -1.66, -0.95]} rotation={[0, -0.3, 0]} />
      {/* overhead utility runs */}
      {pipes.map((q, i) => <Prop key={i} name={i % 6 === 0 ? 'pipe-ring-colored' : 'pipe'} position={q.p} rotation={q.r} />)}
      {/* switches by the hatches */}
      <Prop name="wall-switch" position={[-6.55, 0.35, 1.0]} rotation={[0, Math.PI / 2, 0]} scale={1.4} />
      <Prop name="wall-switch" position={[6.55, 0.35, -1.0]} rotation={[0, -Math.PI / 2, 0]} scale={1.4} />
    </group>
  )
}

const BAG_COLORS = ['#e9e3d3', '#d8cfb7', '#9fb3c8', '#c9b28e', '#e2e6ea']

/** Soft cargo bags and loose items drifting in zero g. */
export function FloatingCargo({ count = 6, reduced = false, avoid }: { count?: number; reduced?: boolean; avoid?: (p: THREE.Vector3) => boolean }) {
  const bags = useMemo(() => {
    const r = seeded(42)
    const out: { p: Vec3; s: Vec3; c: string; spin: Vec3 }[] = []
    let guard = 0
    while (out.length < count && guard++ < 200) {
      const p = new THREE.Vector3((r() - 0.5) * 11, (r() - 0.5) * 1.8, (r() - 0.5) * 1.8)
      if (avoid?.(p)) continue
      out.push({
        p: [p.x, p.y, p.z], s: [0.32 + r() * 0.25, 0.18 + r() * 0.12, 0.24 + r() * 0.16],
        c: BAG_COLORS[Math.floor(r() * BAG_COLORS.length)], spin: [(r() - 0.5) * 0.3, (r() - 0.5) * 0.3, (r() - 0.5) * 0.3],
      })
    }
    return out
  }, [count, avoid])
  const group = useRef<THREE.Group>(null)
  useFrame((_, dt) => {
    if (reduced || !group.current) return
    group.current.children.forEach((m, i) => {
      const b = bags[i]
      m.rotation.x += b.spin[0] * dt
      m.rotation.y += b.spin[1] * dt
      m.rotation.z += b.spin[2] * dt
    })
  })
  return (
    <group ref={group}>
      {bags.map((b, i) => (
        <group key={i} position={b.p}>
          <RoundedBox args={b.s} radius={0.05} smoothness={3}>
            <meshStandardMaterial color={b.c} roughness={0.95} />
          </RoundedBox>
          <mesh>
            <boxGeometry args={[b.s[0] * 0.18, b.s[1] + 0.012, b.s[2] + 0.012]} />
            <meshStandardMaterial color="#3b5b8a" roughness={0.8} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

/** A crew member floating nearby, slowly turning (procedural motion; the model has no rig). */
export function Crewmate({ position, reduced = false, height = 1.5 }: { position: Vec3; reduced?: boolean; height?: number }) {
  const { scene } = useGLTF('/models/astronaut.glb')
  const model = useMemo(() => scene.clone(true), [scene])
  const scale = useMemo(() => {
    const size = new THREE.Box3().setFromObject(scene).getSize(new THREE.Vector3())
    return height / Math.max(size.y, 0.001)
  }, [scene, height])
  return (
    <Float speed={reduced ? 0 : 0.9} rotationIntensity={reduced ? 0 : 0.5} floatIntensity={reduced ? 0 : 0.6}>
      <group position={position} rotation={[0.25, 0.9, -0.35]}>
        <Center scale={scale}><primitive object={model} /></Center>
      </group>
    </Float>
  )
}

/** Round science window (like the one in the ISS Destiny lab) with Earth drifting past. */
export function EarthWindow({ position, rotation = [0, 0, 0], radius = 0.55, reduced = false }: { position: Vec3; rotation?: Vec3; radius?: number; reduced?: boolean }) {
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 1024; c.height = 512
    const g = c.getContext('2d')!
    const sea = g.createLinearGradient(0, 0, 0, 512)
    sea.addColorStop(0, '#0d3b78'); sea.addColorStop(1, '#0a2a58')
    g.fillStyle = sea; g.fillRect(0, 0, 1024, 512)
    const r = seeded(11)
    for (let i = 0; i < 26; i++) { // land
      g.fillStyle = r() > 0.5 ? '#3d6b3f' : '#7a6a45'
      g.beginPath(); g.ellipse(r() * 1024, r() * 512, 30 + r() * 120, 18 + r() * 60, r() * 3, 0, Math.PI * 2); g.fill()
    }
    for (let i = 0; i < 140; i++) { // clouds
      g.fillStyle = `rgba(255,255,255,${0.25 + r() * 0.5})`
      g.beginPath(); g.ellipse(r() * 1024, r() * 512, 10 + r() * 70, 4 + r() * 14, r() * 0.6, 0, Math.PI * 2); g.fill()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = t.wrapT = THREE.RepeatWrapping
    t.repeat.set(0.5, 0.5)
    return t
  }, [])
  const earth = useRef<THREE.MeshBasicMaterial>(null)
  useFrame((_, dt) => {
    const map = earth.current?.map
    if (map && !reduced) map.offset.x = (map.offset.x + dt * 0.006) % 1
  })
  return (
    <group position={position} rotation={rotation}>
      <mesh position={[0, 0, -0.01]}>
        <circleGeometry args={[radius, 64]} />
        <meshBasicMaterial ref={earth} map={texture} toneMapped={false} />
      </mesh>
      <mesh>
        <torusGeometry args={[radius, 0.07, 18, 64]} />
        <meshStandardMaterial color="#b8bfcc" metalness={0.8} roughness={0.25} />
      </mesh>
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <mesh key={i} position={[Math.cos((i * Math.PI) / 4) * (radius + 0.07), Math.sin((i * Math.PI) / 4) * (radius + 0.07), 0.05]}>
          <cylinderGeometry args={[0.025, 0.025, 0.04, 8]} />
          <meshStandardMaterial color="#666e7d" metalness={0.9} roughness={0.2} />
        </mesh>
      ))}
    </group>
  )
}

KIT.forEach((n) => useGLTF.preload(url(n)))
useGLTF.preload('/models/astronaut.glb')
