import { Float, Stars, useGLTF } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { seeded } from '../three/random'
import { Effects } from '../three/parts'

/**
 * Mission hub hero: NASA's ISS model over a code-built Earth limb.
 * Model: "International Space Station (ISS) (B)", NASA 3D Resources
 * (https://science.nasa.gov/3d-resources/). Draco-compressed; the decoder is
 * served locally from /draco/ so nothing loads from a third-party CDN.
 */
const ISS_URL = '/models/iss-nasa.glb'
const DRACO = '/draco/'

export default function BriefingScene({ reduced }: { reduced: boolean }) {
  return (
    <Canvas camera={{ position: [0, 1.2, 9], fov: 38 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}
      frameloop={reduced ? 'demand' : 'always'}>
      <ambientLight intensity={0.25} />
      <directionalLight position={[8, 4, 6]} intensity={3.2} color="#fff4e0" />
      <directionalLight position={[-6, -2, -4]} intensity={0.7} color="#6cc8ff" />
      <Stars radius={80} depth={40} count={2600} factor={2.6} saturation={0} fade speed={reduced ? 0 : 0.35} />
      <Earth reduced={reduced} />
      <Float speed={reduced ? 0 : 0.8} rotationIntensity={reduced ? 0 : 0.12} floatIntensity={reduced ? 0 : 0.35}>
        <Iss reduced={reduced} />
      </Float>
      <Effects bloom={0.7} />
    </Canvas>
  )
}

function Iss({ reduced }: { reduced: boolean }) {
  const { scene } = useGLTF(ISS_URL, DRACO)
  const group = useRef<THREE.Group>(null)
  // normalize: centre the model and scale its longest side to ~6.5 units
  const { model, scale, offset } = useMemo(() => {
    const m = scene.clone(true)
    m.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.isMesh) {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material]
        mats.forEach((mat) => {
          const s = mat as THREE.MeshStandardMaterial
          if ('metalness' in s) { s.metalness = Math.min(0.6, s.metalness + 0.2); s.roughness = Math.max(0.35, s.roughness) }
        })
      }
    })
    const box = new THREE.Box3().setFromObject(m)
    const size = box.getSize(new THREE.Vector3())
    const centre = box.getCenter(new THREE.Vector3())
    return { model: m, scale: 6.5 / Math.max(size.x, size.y, size.z, 0.001), offset: centre.multiplyScalar(-1) }
  }, [scene])
  useFrame((_, dt) => {
    if (group.current && !reduced) group.current.rotation.y += dt * 0.06
  })
  return (
    <group ref={group} rotation={[0.35, -0.6, 0.08]} position={[0, 0.6, 0]}>
      <group scale={scale}>
        <primitive object={model} position={offset} />
      </group>
    </group>
  )
}

const atmoVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`
const atmoFragment = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float rim = 1.0 - max(0.0, dot(normalize(vView), normalize(vNormal)));
  float glow = pow(rim, 3.0);
  gl_FragColor = vec4(vec3(0.35, 0.65, 1.0) * glow * 2.2, glow);
}`

/** Earth limb below the station: dark ocean sphere, cloud bands, glowing atmosphere. */
function Earth({ reduced }: { reduced: boolean }) {
  const surface = useRef<THREE.Mesh>(null)
  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = 512; c.height = 256
    const g = c.getContext('2d')!
    const grad = g.createLinearGradient(0, 0, 0, 256)
    grad.addColorStop(0, '#0b2a55'); grad.addColorStop(0.5, '#0e3d74'); grad.addColorStop(1, '#0a2347')
    g.fillStyle = grad; g.fillRect(0, 0, 512, 256)
    // procedural land and cloud streaks (stylized, not a real map)
    const r = seeded(7)
    for (let i = 0; i < 90; i++) {
      g.fillStyle = i % 3 ? 'rgba(255,255,255,0.10)' : 'rgba(46,110,70,0.55)'
      g.beginPath()
      g.ellipse(r() * 512, r() * 256, 10 + r() * 60, 3 + r() * 12, r() * 3, 0, Math.PI * 2)
      g.fill()
    }
    const t = new THREE.CanvasTexture(c)
    t.colorSpace = THREE.SRGBColorSpace
    t.wrapS = THREE.RepeatWrapping
    return t
  }, [])
  useFrame((_, dt) => {
    if (surface.current && !reduced) surface.current.rotation.y += dt * 0.01
  })
  return (
    <group position={[0, -27, -6]}>
      <mesh ref={surface}>
        <sphereGeometry args={[24, 96, 64]} />
        <meshStandardMaterial map={texture} roughness={0.9} metalness={0} emissive="#06142b" emissiveIntensity={0.4} />
      </mesh>
      <mesh scale={1.035}>
        <sphereGeometry args={[24, 96, 64]} />
        <shaderMaterial vertexShader={atmoVertex} fragmentShader={atmoFragment} transparent depthWrite={false}
          blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
    </group>
  )
}

useGLTF.preload(ISS_URL, DRACO)
