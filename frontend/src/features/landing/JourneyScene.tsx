import { Environment, Lightformer } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useMotionValueEvent, type MotionValue } from 'framer-motion'
import { AdditiveBlending, CatmullRomCurve3, Vector3 } from 'three'
import { Chamber } from './Chamber'

const cameraPath = new CatmullRomCurve3([
  new Vector3(-6.8, 3.65, 9.7),
  new Vector3(-3.75, 2.15, 8.1),
  new Vector3(-0.8, 1.0, 6.1),
  new Vector3(0.45, 0.26, 2.75),
])
const aim = new Vector3()

export default function JourneyScene({ progress }: { progress: MotionValue<number> }) {
  return (
    <Canvas
      camera={{ fov: 40, near: 0.1, far: 60 }}
      dpr={[1, 1.5]}
      frameloop="demand"
      gl={{ alpha: true, antialias: true }}
      fallback={null}
    >
      <JourneyCamera progress={progress} />
      <Environment resolution={64} frames={1} environmentIntensity={0.8}>
        <Lightformer position={[1, 6, 3]} rotation={[Math.PI / 2, 0, 0]} scale={6} intensity={3} />
        <Lightformer position={[-6, 1, 3]} rotation={[0, -Math.PI / 2, 0]} scale={5} intensity={2} color="#8bb6ff" />
      </Environment>
      <ambientLight intensity={0.62} />
      <directionalLight position={[4, 5, 7]} color="#d5e9ff" intensity={3.1} />
      <directionalLight position={[-4, 1, -3]} color="#5473ea" intensity={2.4} />
      <pointLight position={[-0.2, 0.13, 0.24]} color="#73b9ff" intensity={2.5} distance={2.2} />
      <Chamber />
      <Flame />
    </Canvas>
  )
}

function JourneyCamera({ progress }: { progress: MotionValue<number> }) {
  const invalidate = useThree((state) => state.invalidate)
  useMotionValueEvent(progress, 'change', () => invalidate())

  useFrame(({ camera, size }) => {
    const t = progress.get()
    cameraPath.getPoint(t, camera.position)
    const distance = camera.position.length()
    if (size.width < 900) camera.position.multiplyScalar(Math.max(1, 1.35 * size.height / size.width))
    aim.set(-0.2 * t, 0.14 - 0.06 * t, 0)
    camera.lookAt(aim)
    if (size.width >= 1024) camera.translateX(-distance * Math.min(0.23, 0.12 * size.width / size.height))
  })

  return null
}

const flameVertex = `
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vLocal;
void main() {
  vec4 viewPosition = modelViewMatrix * vec4(position, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = -viewPosition.xyz;
  vLocal = position;
  gl_Position = projectionMatrix * viewPosition;
}`
const flameFragment = `
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vLocal;
void main() {
  float facing = max(0.0, dot(normalize(vView), normalize(vNormal)));
  float edgeFade = smoothstep(0.05, 0.43, facing);
  float rimOffset = facing - 0.51;
  float coreOffset = vLocal.y + 0.48 + 0.1 * sin(vLocal.x * 5.0);
  float shell = 0.62 * exp(-24.0 * rimOffset * rimOffset);
  float core = pow(facing, 3.0) * exp(-6.0 * coreOffset * coreOffset);
  float ripple = 0.78 + 0.22 * sin(7.0 * vLocal.x + 12.0 * vLocal.y + 2.0 * sin(vLocal.z * 6.0));
  float base = smoothstep(-0.98, -0.6, vLocal.y);
  vec3 blue = mix(vec3(0.17, 0.42, 1.0), vec3(0.75, 0.92, 1.0), core);
  gl_FragColor = vec4(blue, (0.07 + shell * ripple + core * 0.82) * edgeFade * base);
}`

function Flame() {
  return (
    <mesh position={[-0.18, 0.065, 0.11]} rotation={[0.06, 0, -0.3]} scale={[0.68, 0.33, 0.37]}>
      <sphereGeometry args={[1, 48, 32]} />
      <shaderMaterial vertexShader={flameVertex} fragmentShader={flameFragment} transparent blending={AdditiveBlending} depthWrite={false} toneMapped={false} />
    </mesh>
  )
}
