import { Center, Environment, Lightformer, useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'

/**
 * 3D astronaut companion.
 * Model: "Astronaut" by PW Wu — CC-BY 3.0 (https://creativecommons.org/licenses/by/3.0/),
 * via Poly Pizza (https://poly.pizza/m/erlAEWfFKH3). Credit is also shown in the UI.
 *
 * The model has no built-in animation, so motion is procedural: zero-g drift,
 * easing toward the cursor, and while `talking` a pulsing visor light plus
 * "voice" rings radiating from the helmet.
 */
const MODEL_URL = '/models/astronaut.glb'

export default function AstronautScene({ talking, reduced }: { talking: boolean; reduced: boolean }) {
  return (
    <Canvas camera={{ position: [0, 0, 5.2], fov: 30 }} dpr={[1, 1.75]} gl={{ alpha: true, antialias: true }}>
      <ambientLight intensity={0.55} />
      <directionalLight position={[3, 4, 5]} intensity={2.6} color="#fff3e2" />
      <directionalLight position={[-4, 1, -2]} intensity={1.6} color="#6cc8ff" />
      <directionalLight position={[0, -3, 2]} intensity={0.6} color="#9d8cff" />
      {/* local reflection environment (no network fetch) */}
      <Environment resolution={256}>
        <Lightformer form="rect" intensity={3} color="#ffffff" position={[0, 3, 3]} scale={[6, 2, 1]} />
        <Lightformer form="rect" intensity={2} color="#6cc8ff" position={[-4, 0, 1]} scale={[2, 6, 1]} />
        <Lightformer form="rect" intensity={1.5} color="#9d8cff" position={[4, -1, 1]} scale={[2, 6, 1]} />
      </Environment>
      <Astronaut talking={talking} reduced={reduced} />
    </Canvas>
  )
}

function Astronaut({ talking, reduced }: { talking: boolean; reduced: boolean }) {
  const { scene } = useGLTF(MODEL_URL)
  // clone so several mounts never share one scene graph
  const model = useMemo(() => scene.clone(true), [scene])
  const root = useRef<THREE.Group>(null)
  const light = useRef<THREE.PointLight>(null)
  const rings = useRef<(THREE.Mesh | null)[]>([])
  const talk = useRef(0)

  useFrame((state, dt) => {
    const t = state.clock.elapsedTime
    talk.current += ((talking ? 1 : 0) - talk.current) * Math.min(1, dt * 4)
    const k = talk.current
    const g = root.current
    if (g && !reduced) {
      g.position.y = Math.sin(t * 0.8) * 0.1
      g.rotation.z = Math.sin(t * 0.5) * 0.08 + Math.sin(t * 7) * 0.015 * k
      const ty = state.pointer.x * 0.2 + Math.sin(t * 0.3) * 0.08
      const tx = -state.pointer.y * 0.2
      g.rotation.y += (ty - g.rotation.y) * 0.035
      g.rotation.x += (tx - g.rotation.x) * 0.035
    }
    if (light.current) light.current.intensity = k * (2.5 + (reduced ? 0 : Math.abs(Math.sin(t * 8)) * 3))
    rings.current.forEach((m, i) => {
      if (!m) return
      const p = reduced ? 0.5 : (t * 0.9 + i / 3) % 1
      m.scale.setScalar(0.4 + p * 1.4)
      ;(m.material as THREE.MeshBasicMaterial).opacity = k * (1 - p) * 0.6
    })
  })

  return (
    <group ref={root}>
      <Center scale={2.05}>
        {/* the source model faces away from the camera — turn it to face the viewer */}
        <group rotation={[0, Math.PI, 0]}>
          <primitive object={model} />
        </group>
      </Center>
      {/* visor light + voice rings, near the helmet */}
      <pointLight ref={light} position={[-0.2, 0.65, 1.1]} color="#6cc8ff" distance={3} intensity={0} />
      {[0, 1, 2].map((i) => (
        <mesh key={i} ref={(el) => { rings.current[i] = el }} position={[-0.22, 0.62, 0.2]}>
          <torusGeometry args={[0.55, 0.008, 8, 64]} />
          <meshBasicMaterial color="#6cc8ff" transparent opacity={0} depthWrite={false} blending={THREE.AdditiveBlending} />
        </mesh>
      ))}
    </group>
  )
}

useGLTF.preload(MODEL_URL)
