import { Line, OrthographicCamera, useTexture } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useMemo, useRef, type ReactNode } from 'react'
import * as THREE from 'three'
import { BaseModel, CapsuleModel, RoverModel, StationModel } from './CraftModels'
import { BODIES, CRAFT, ISS_ORBIT, OFFSET_X, type Body, type Craft } from './planets'

type Props = {
  zoom: number
  reduced: boolean
  active: string | null
  onHover: (id: string | null) => void
  onPick: (craft: Craft) => void
}

/**
 * Earth, Mars and the Moon side by side at true relative size (orthographic camera, so
 * nothing is enlarged by perspective), with craft and bases for each crew environment.
 */
export default function PlanetLineupScene({ zoom, reduced, active, onHover, onPick }: Props) {
  return (
    <Canvas dpr={[1, 2]} gl={{ alpha: true, antialias: true }}>
      <OrthographicCamera makeDefault position={[-OFFSET_X, 0, 10]} zoom={zoom} />
      <ambientLight intensity={0.12} />
      <directionalLight position={[-5, 2.5, 6]} intensity={2.8} color="#fff4e6" />
      <directionalLight position={[6, -2, 3]} intensity={0.25} color="#6cc8ff" />
      {BODIES.map((b) => <Planet key={b.id} body={b} reduced={reduced} />)}
      <Paths active={active} />
      {CRAFT.map((c) => (
        <CraftSlot key={c.id} craft={c} hovered={active === c.id} onHover={onHover} onPick={onPick} reduced={reduced}>
          {c.id === 'station' && <StationModel reduced={reduced} />}
          {c.id === 'spacecraft' && <CapsuleModel reduced={reduced} />}
          {c.id === 'mars_base' && <BaseModel tint="#f1e3d6" />}
          {c.id === 'rover' && <RoverModel reduced={reduced} />}
          {c.id === 'lunar_base' && <BaseModel scale={0.7} />}
        </CraftSlot>
      ))}
    </Canvas>
  )
}

function Planet({ body, reduced }: { body: Body; reduced: boolean }) {
  const map = useTexture(body.texture, (t) => { t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8 })
  const spin = useRef<THREE.Mesh>(null)
  useFrame((_, dt) => {
    if (spin.current && !reduced) spin.current.rotation.y += Math.min(dt, 0.05) * body.spin
  })
  return (
    <group position={[body.x, 0, 0]} rotation={[0, 0, body.tilt]}>
      <mesh ref={spin} rotation={[0, body.turn, 0]}>
        <sphereGeometry args={[body.r, 96, 96]} />
        <meshStandardMaterial map={map} roughness={body.id === 'earth' ? 0.65 : 0.95} metalness={0} />
      </mesh>
      {body.atmosphere && <Atmosphere r={body.r} color={body.atmosphere} />}
    </group>
  )
}

/** Soft rim of air: a slightly larger back-facing shell that glows at the edge. */
function Atmosphere({ r, color }: { r: number; color: string }) {
  const uniforms = useMemo(() => ({ glow: { value: new THREE.Color(color) } }), [color])
  return (
    <mesh scale={1.07}>
      <sphereGeometry args={[r, 64, 64]} />
      <shaderMaterial
        uniforms={uniforms}
        side={THREE.BackSide}
        transparent
        depthWrite={false}
        vertexShader="varying vec3 n; void main(){ n = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }"
        fragmentShader="uniform vec3 glow; varying vec3 n; void main(){ float t = clamp(-n.z / 0.4, 0.0, 1.0); gl_FragColor = vec4(glow, pow(t, 3.0) * 0.9); }"
      />
    </mesh>
  )
}

/** The station's orbit around Earth and the spacecraft's dashed Earth → Mars transfer path. */
function Paths({ active }: { active: string | null }) {
  const [earth, mars] = BODIES
  const craft = CRAFT.find((c) => c.id === 'spacecraft')!
  const orbit = useMemo(() => Array.from({ length: 97 }, (_, i) => {
    const a = (i / 96) * Math.PI * 2
    return new THREE.Vector3(earth.x + Math.sin(a) * ISS_ORBIT, Math.cos(a) * ISS_ORBIT, -0.4)
  }), [earth])
  const transfer = useMemo(() => new THREE.QuadraticBezierCurve3(
    new THREE.Vector3(earth.x + earth.r * 0.6, earth.r * 0.95, -0.3),
    new THREE.Vector3(craft.x - 0.2, craft.y + 0.35, -0.3),
    new THREE.Vector3(mars.x + mars.r * 0.3, mars.r * 1.25, -0.3),
  ).getPoints(48), [earth, mars, craft])
  return (
    <>
      <Line points={orbit} color="#6cc8ff" lineWidth={1} transparent opacity={active === 'station' ? 0.7 : 0.22} />
      <Line points={transfer} color="#ffcf4a" lineWidth={1.2} dashed dashSize={0.06} gapSize={0.05} transparent opacity={active === 'spacecraft' ? 0.85 : 0.35} />
    </>
  )
}

/** Positions a model, grows it on hover, and gives it a generous invisible hit area. */
function CraftSlot({ craft, hovered, onHover, onPick, reduced, children }: {
  craft: Craft; hovered: boolean; onHover: (id: string | null) => void; onPick: (craft: Craft) => void; reduced: boolean; children: ReactNode
}) {
  const group = useRef<THREE.Group>(null)
  const floating = craft.id === 'station' || craft.id === 'spacecraft'
  useFrame(({ clock }, dt) => {
    const g = group.current
    if (!g) return
    const s = g.scale.x + ((hovered ? 1.6 : 1.3) - g.scale.x) * Math.min(1, Math.min(dt, 0.05) * 10)
    g.scale.setScalar(s)
    g.position.y = craft.y + (floating && !reduced ? Math.sin(clock.elapsedTime * 1.2 + craft.x) * 0.02 : 0)
  })
  return (
    <group ref={group} position={[craft.x, craft.y, 0.5]} rotation={[0, 0, craft.angle]} scale={1.3}>
      {/* surface models are tilted to stand on the ground; give them a slight 3/4 view */}
      <group rotation={[0.35, floating ? 0.5 : -0.5, 0]}>{children}</group>
      <mesh
        onPointerOver={(e) => { e.stopPropagation(); onHover(craft.id); document.body.style.cursor = 'pointer' }}
        onPointerOut={() => { onHover(null); document.body.style.cursor = '' }}
        onClick={(e) => { e.stopPropagation(); onPick(craft) }}
      >
        <sphereGeometry args={[0.13, 12, 12]} />
        <meshBasicMaterial transparent opacity={0} depthWrite={false} />
      </mesh>
    </group>
  )
}
