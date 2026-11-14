import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMemo, useRef, useState, type ReactNode } from 'react'
import * as THREE from 'three'
import type { SafetyTopic } from '@/api/types'

/** Three rotating safety objects — shield, smoke detector, extinguisher — that toggle topic filters. */
type Props = { active: SafetyTopic[]; onToggle: (t: SafetyTopic) => void; reduced: boolean }

const COLOR: Record<SafetyTopic, string> = { prevention: '#7dd3a7', detection: '#6cc8ff', suppression: '#c79bff' }

export default function TopicScene({ active, onToggle, reduced }: Props) {
  return (
    <Canvas camera={{ position: [0, 0.2, 4.9], fov: 32 }} dpr={[1, 1.75]} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={2.2} color="#fff3e2" />
      <directionalLight position={[-4, -1, 2]} intensity={0.8} color="#6cc8ff" />
      <Lineup active={active} onToggle={onToggle} reduced={reduced} />
    </Canvas>
  )
}

/** One object per third of the canvas width, so the HTML captions underneath sit exactly below them. */
function Lineup({ active, onToggle, reduced }: Props) {
  const third = useThree((s) => s.viewport.width) / 3
  const x = Math.min(third, 2.1)
  return (
    <>
      <TopicObj x={-x} topic="prevention" active={active.includes('prevention')} onToggle={onToggle} reduced={reduced}>
        <Shield />
      </TopicObj>
      <TopicObj x={0} topic="detection" active={active.includes('detection')} onToggle={onToggle} reduced={reduced}>
        <Detector reduced={reduced} />
      </TopicObj>
      <TopicObj x={x} topic="suppression" active={active.includes('suppression')} onToggle={onToggle} reduced={reduced}>
        <Extinguisher />
      </TopicObj>
    </>
  )
}

function TopicObj({ x, topic, active, onToggle, reduced, children }: { x: number; topic: SafetyTopic; active: boolean; onToggle: (t: SafetyTopic) => void; reduced: boolean; children: ReactNode }) {
  const g = useRef<THREE.Group>(null)
  const ring = useRef<THREE.Mesh>(null)
  const [hover, setHover] = useState(false)
  useFrame((s, dt) => {
    if (!g.current) return
    // rock gently so the object always faces the viewer; spin when hovered
    if (!reduced) {
      if (hover) g.current.rotation.y += dt * 2.2
      else g.current.rotation.y += (Math.sin(s.clock.elapsedTime * 0.7 + x) * 0.5 - g.current.rotation.y) * 0.05
    }
    const target = hover ? 1.12 : active ? 1.06 : 1
    g.current.scale.lerp(new THREE.Vector3(target, target, target), 0.12)
    g.current.position.y = reduced ? 0 : Math.sin(s.clock.elapsedTime * 1.2 + x) * 0.06
    if (ring.current) {
      const m = ring.current.material as THREE.MeshBasicMaterial
      m.opacity += ((active ? 0.9 : hover ? 0.35 : 0) - m.opacity) * 0.15
    }
  })
  return (
    <group position={[x, 0, 0]}>
      <group
        ref={g}
        onClick={(e) => {
          e.stopPropagation()
          onToggle(topic)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHover(true)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHover(false)
          document.body.style.cursor = ''
        }}
      >
        {children}
      </group>
      <mesh ref={ring} position={[0, -0.92, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[0.72, 0.018, 8, 64]} />
        <meshBasicMaterial color={COLOR[topic]} transparent opacity={0} />
      </mesh>
      {active && <pointLight position={[0, 0, 1]} intensity={2.5} distance={3} color={COLOR[topic]} />}
    </group>
  )
}

function Shield() {
  const geo = useMemo(() => {
    const s = new THREE.Shape()
    s.moveTo(0, 0.72)
    s.lineTo(0.55, 0.52)
    s.lineTo(0.52, -0.05)
    s.quadraticCurveTo(0.38, -0.52, 0, -0.75)
    s.quadraticCurveTo(-0.38, -0.52, -0.52, -0.05)
    s.lineTo(-0.55, 0.52)
    s.closePath()
    const g = new THREE.ExtrudeGeometry(s, { depth: 0.14, bevelEnabled: true, bevelThickness: 0.05, bevelSize: 0.05, bevelSegments: 4 })
    g.center()
    return g
  }, [])
  const check = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([new THREE.Vector3(-0.22, 0.02, 0.14), new THREE.Vector3(-0.06, -0.16, 0.14), new THREE.Vector3(0.26, 0.24, 0.14)], false, 'catmullrom', 0)
    return new THREE.TubeGeometry(c, 20, 0.045, 8, false)
  }, [])
  return (
    <group>
      <mesh geometry={geo}>
        <meshStandardMaterial color="#7dd3a7" metalness={0.55} roughness={0.28} emissive="#1f5a40" emissiveIntensity={0.35} />
      </mesh>
      <mesh geometry={check}>
        <meshStandardMaterial color="#effff6" emissive="#bff5d9" emissiveIntensity={0.5} />
      </mesh>
    </group>
  )
}

function Detector({ reduced }: { reduced: boolean }) {
  const led = useRef<THREE.MeshStandardMaterial>(null)
  useFrame((s) => {
    if (led.current) led.current.emissiveIntensity = reduced ? 2 : 1 + Math.max(0, Math.sin(s.clock.elapsedTime * 4)) * 3
  })
  return (
    <group rotation={[Math.PI / 2 - 0.25, 0, 0]}>
      <mesh>
        <cylinderGeometry args={[0.62, 0.66, 0.18, 48]} />
        <meshStandardMaterial color="#eef0f5" metalness={0.1} roughness={0.5} />
      </mesh>
      {[0.48, 0.36].map((r) => (
        <mesh key={r} position={[0, 0.095, 0]} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[r, 0.014, 8, 48]} />
          <meshStandardMaterial color="#a7aec0" />
        </mesh>
      ))}
      <mesh position={[0, 0.1, 0]} scale={[1, 0.45, 1]}>
        <sphereGeometry args={[0.2, 24, 16]} />
        <meshStandardMaterial color="#dfe3ec" roughness={0.35} />
      </mesh>
      <mesh position={[0.36, 0.1, -0.3]}>
        <sphereGeometry args={[0.04, 12, 12]} />
        <meshStandardMaterial ref={led} color="#6cc8ff" emissive="#6cc8ff" emissiveIntensity={2} />
      </mesh>
    </group>
  )
}

function Extinguisher() {
  const hose = useMemo(() => {
    const c = new THREE.CatmullRomCurve3([
      new THREE.Vector3(0.1, 0.62, 0),
      new THREE.Vector3(0.38, 0.55, 0),
      new THREE.Vector3(0.42, 0.1, 0.05),
      new THREE.Vector3(0.36, -0.25, 0.08),
    ])
    return new THREE.TubeGeometry(c, 24, 0.03, 8, false)
  }, [])
  return (
    <group position={[0, -0.12, 0]}>
      <mesh>
        <cylinderGeometry args={[0.27, 0.27, 1.0, 40]} />
        <meshStandardMaterial color="#d9534f" metalness={0.45} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.5, 0]}>
        <sphereGeometry args={[0.27, 40, 20, 0, Math.PI * 2, 0, Math.PI / 2]} />
        <meshStandardMaterial color="#d9534f" metalness={0.45} roughness={0.3} />
      </mesh>
      <mesh position={[0, 0.05, 0]}>
        <cylinderGeometry args={[0.275, 0.275, 0.28, 40]} />
        <meshStandardMaterial color="#f1f2f6" roughness={0.6} />
      </mesh>
      <mesh position={[0, 0.84, 0]}>
        <cylinderGeometry args={[0.07, 0.09, 0.16, 20]} />
        <meshStandardMaterial color="#2b2f3a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh position={[0.05, 0.95, 0]} rotation={[0, 0, -0.25]}>
        <boxGeometry args={[0.42, 0.05, 0.08]} />
        <meshStandardMaterial color="#2b2f3a" metalness={0.8} roughness={0.3} />
      </mesh>
      <mesh geometry={hose}>
        <meshStandardMaterial color="#20232b" roughness={0.6} />
      </mesh>
    </group>
  )
}
