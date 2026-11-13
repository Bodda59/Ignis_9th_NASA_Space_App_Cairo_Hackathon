import { Stars, useTexture } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useRef } from 'react'
import * as THREE from 'three'
import { Effects } from '@/features/mission/three/parts'

/**
 * Moonwalk hero: the Moon from space with Earth in the distance.
 * Moon: NASA SVS CGI Moon Kit (LRO LROC colour mosaic + LOLA elevation), public domain
 * (https://svs.gsfc.nasa.gov/4720). Earth: NASA Blue Marble.
 */
const MOON = ['/textures/moon/color.jpg', '/textures/moon/height.jpg']
const EARTH = '/textures/earth/day.jpg'

export default function MoonHeroScene({ reduced }: { reduced: boolean }) {
  return (
    <Canvas camera={{ position: [0, 0, 10], fov: 38 }} dpr={[1, 1.75]} gl={{ antialias: true, alpha: true }}
      frameloop={reduced ? 'demand' : 'always'}>
      <ambientLight intensity={0.06} />
      {/* Sunlight from the upper left, so the terminator and crater shadows show */}
      <directionalLight position={[-7, 3, 4]} intensity={3.4} color="#fff6ea" />
      <directionalLight position={[5, -2, 3]} intensity={0.25} color="#6cc8ff" />
      <Stars radius={80} depth={40} count={2600} factor={2.6} saturation={0} fade speed={reduced ? 0 : 0.35} />
      <Layout reduced={reduced} />
      <Effects bloom={0.35} />
    </Canvas>
  )
}

/** Moon to the right of the hero text on wide screens; above it on narrow ones. */
function Layout({ reduced }: { reduced: boolean }) {
  const { viewport } = useThree()
  const wide = viewport.aspect > 1.2
  const rig = useRef<THREE.Group>(null)
  useFrame((state) => {
    if (!rig.current || reduced) return
    rig.current.rotation.y += (state.pointer.x * 0.06 - rig.current.rotation.y) * 0.03
    rig.current.rotation.x += (-state.pointer.y * 0.04 - rig.current.rotation.x) * 0.03
  })
  return (
    <group ref={rig}>
      <Moon reduced={reduced} position={wide ? [3.4, 0.4, -1] : [0, 1.9, -2]} radius={wide ? 3.6 : 2.6} />
      <Earth position={wide ? [-4.8, 2.7, -7] : [-2.2, 3.9, -7]} />
    </group>
  )
}

function Moon({ reduced, position, radius }: { reduced: boolean; position: [number, number, number]; radius: number }) {
  const [color, height] = useTexture(MOON, ([c]) => {
    c.colorSpace = THREE.SRGBColorSpace
    c.anisotropy = 8
  })
  const mesh = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (mesh.current && !reduced) mesh.current.rotation.y += dt * 0.025
  })
  // u = 0.5 is the near side (0° longitude); SphereGeometry faces u = 0.25 toward the camera.
  return (
    <mesh ref={mesh} position={position} rotation={[0.1, -Math.PI / 2, 0]}>
      <sphereGeometry args={[radius, 160, 120]} />
      <meshStandardMaterial map={color} bumpMap={height} bumpScale={4} roughness={1} metalness={0} />
    </mesh>
  )
}

const haloVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  vec4 mv = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = -mv.xyz;
  gl_Position = projectionMatrix * mv;
}`
const haloFragment = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
void main() {
  float glow = pow(1.0 - max(0.0, dot(normalize(vView), normalize(vNormal))), 3.0);
  gl_FragColor = vec4(vec3(0.42, 0.78, 1.0), glow);
}`

function Earth({ position }: { position: [number, number, number] }) {
  const map = useTexture(EARTH, (t) => { t.colorSpace = THREE.SRGBColorSpace })
  return (
    <group position={position}>
      <mesh rotation={[0.2, -1.9, -0.4]}>
        <sphereGeometry args={[0.55, 64, 48]} />
        <meshStandardMaterial map={map} roughness={0.8} metalness={0} />
      </mesh>
      <mesh scale={1.06}>
        <sphereGeometry args={[0.55, 48, 32]} />
        <shaderMaterial vertexShader={haloVertex} fragmentShader={haloFragment} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}
