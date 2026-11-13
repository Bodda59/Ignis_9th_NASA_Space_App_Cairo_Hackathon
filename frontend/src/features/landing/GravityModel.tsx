import { Float } from '@react-three/drei'
import { Canvas } from '@react-three/fiber'
import { useReducedMotion } from 'framer-motion'

export default function GravityModel({ gravity, color }: { gravity: number; color: string }) {
  const reduced = !!useReducedMotion()
  const orbital = gravity < .01
  return <Canvas camera={{ position: [0, 1.2, 4.8], fov: 39 }} dpr={[1, 1.5]}
    frameloop={reduced ? 'demand' : 'always'} gl={{ alpha: true, antialias: true }}
    fallback={<div className="mx-auto mt-10 size-24 rounded-full" style={{ background: `radial-gradient(circle at 35% 30%, white, ${color} 28%, #171827 80%)` }} />}>
    <ambientLight intensity={.8} />
    <directionalLight position={[3, 4, 4]} intensity={2.5} />
    <Float speed={reduced ? 0 : 1.2} rotationIntensity={reduced ? 0 : .32} floatIntensity={reduced ? 0 : .45}>
      <mesh>
        <icosahedronGeometry args={[orbital ? .4 : .82, orbital ? 0 : 3]} />
        <meshStandardMaterial color={color} roughness={.75} flatShading />
      </mesh>
      <mesh rotation={[1.17, -.3, .35]}>
        <torusGeometry args={[1.28, .009, 8, 72]} />
        <meshBasicMaterial color={color} transparent opacity={.45} />
      </mesh>
      <mesh rotation={[1.05, .2, -.1]}>
        <torusGeometry args={[1.54, .006, 8, 72]} />
        <meshBasicMaterial color={color} transparent opacity={.27} />
      </mesh>
    </Float>
  </Canvas>
}
