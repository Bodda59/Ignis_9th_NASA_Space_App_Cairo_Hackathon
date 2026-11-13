import { Environment, Lightformer } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import { Bloom, EffectComposer, Vignette } from '@react-three/postprocessing'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { seeded } from './random'

/**
 * Shared, code-built 3D parts for the mission scenes.
 * The ISS module interior is stylized (not to scale): a square cross-section of
 * equipment racks on four sides, as in real US-lab modules, running along x.
 */

export const MODULE_LENGTH = 14
export const HALF = 1.7 // half-width of the rack box

const RACK_COLORS = ['#d9dde6', '#c9ced9', '#e4e6ec', '#bfc5d2']

/** Local reflection environment: no network fetch. */
export function CabinLighting({ alarm = 0 }: { alarm?: number }) {
  return (
    <>
      <ambientLight intensity={0.35} />
      <hemisphereLight args={['#dfe9ff', '#1a1f2e', 0.55]} />
      <Environment resolution={128} frames={1}>
        <Lightformer form="rect" intensity={2.2} color="#f4f7ff" position={[0, 2.5, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[12, 1.2, 1]} />
        <Lightformer form="rect" intensity={0.9} color="#6cc8ff" position={[-6, 0, 2]} scale={[2, 4, 1]} />
        <Lightformer form="rect" intensity={0.7} color="#9d8cff" position={[6, 0, -2]} scale={[2, 4, 1]} />
      </Environment>
      <AlarmLight level={alarm} />
    </>
  )
}

function AlarmLight({ level }: { level: number }) {
  const light = useRef<THREE.PointLight>(null)
  useFrame(({ clock }) => {
    if (light.current) light.current.intensity = level * (0.6 + Math.abs(Math.sin(clock.elapsedTime * 5)) * 2.2)
  })
  return <pointLight ref={light} position={[0, 1.3, 0]} color="#ff5a3c" distance={12} intensity={0} />
}

/** Bloom + vignette: makes flames, smoke and status lights glow. */
export function Effects({ bloom = 0.9 }: { bloom?: number }) {
  return (
    <EffectComposer multisampling={0}>
      <Bloom mipmapBlur intensity={bloom} luminanceThreshold={0.62} luminanceSmoothing={0.2} />
      <Vignette eskil={false} offset={0.25} darkness={0.7} />
    </EffectComposer>
  )
}

/** Racks, handrails, light strips and hatch rings of one module, seen from inside. */
export function ModuleInterior({ rackGlow = 0 }: { rackGlow?: number }) {
  const racks = useMemo(() => {
    const out: { pos: [number, number, number]; rot: [number, number, number]; color: string; key: string }[] = []
    const n = 6
    for (let i = 0; i < n; i++) {
      const x = -MODULE_LENGTH / 2 + 1.25 + i * ((MODULE_LENGTH - 2.5) / (n - 1))
      const c = RACK_COLORS[i % RACK_COLORS.length]
      out.push({ key: `f${i}`, pos: [x, -HALF, 0], rot: [-Math.PI / 2, 0, 0], color: c }) // deck
      out.push({ key: `c${i}`, pos: [x, HALF, 0], rot: [Math.PI / 2, 0, 0], color: c }) // overhead
      out.push({ key: `p${i}`, pos: [x, 0, -HALF], rot: [0, 0, 0], color: c }) // port (rack wall)
      out.push({ key: `s${i}`, pos: [x, 0, HALF], rot: [0, Math.PI, 0], color: c }) // starboard
    }
    return out
  }, [])

  return (
    <group>
      {/* outer shell */}
      <mesh>
        <boxGeometry args={[MODULE_LENGTH + 0.4, HALF * 2 + 0.25, HALF * 2 + 0.25]} />
        <meshStandardMaterial color="#8d94a5" side={THREE.BackSide} roughness={0.85} />
      </mesh>
      {racks.map((r) => (
        <group key={r.key} position={r.pos} rotation={r.rot}>
          <Rack color={r.color} glow={r.key.startsWith('p') ? rackGlow : 0} />
        </group>
      ))}
      {/* light strips along the corners */}
      {[[1, 1], [1, -1], [-1, 1], [-1, -1]].map(([y, z]) => (
        <mesh key={`${y}${z}`} position={[0, y * (HALF - 0.12), z * (HALF - 0.12)]}>
          <boxGeometry args={[MODULE_LENGTH - 1, 0.05, 0.05]} />
          <meshStandardMaterial color="#ffffff" emissive="#eaf3ff" emissiveIntensity={2.4} toneMapped={false} />
        </mesh>
      ))}
      {/* yellow handrails */}
      {[-HALF + 0.22, HALF - 0.22].map((z) => (
        <mesh key={z} position={[0, -0.55, z]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[0.028, 0.028, MODULE_LENGTH - 1.2, 10]} />
          <meshStandardMaterial color="#e6b422" metalness={0.3} roughness={0.4} />
        </mesh>
      ))}
      {/* hatch rings at both ends */}
      {[-MODULE_LENGTH / 2, MODULE_LENGTH / 2].map((x) => (
        <group key={x} position={[x, 0, 0]} rotation={[0, Math.PI / 2, 0]}>
          <mesh>
            <torusGeometry args={[1.05, 0.09, 16, 64]} />
            <meshStandardMaterial color="#aab1c0" metalness={0.75} roughness={0.3} />
          </mesh>
          <mesh>
            <circleGeometry args={[1.0, 48]} />
            <meshStandardMaterial color="#0b0e16" emissive="#1b2a48" emissiveIntensity={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Rack({ color, glow }: { color: string; glow: number }) {
  return (
    <group>
      <mesh position={[0, 0, 0.02]}>
        <boxGeometry args={[2.0, 3.0, 0.08]} />
        <meshStandardMaterial color={color} roughness={0.55} metalness={0.15} />
      </mesh>
      {/* panel seams and latches */}
      {[-0.75, 0.15, 0.95].map((y) => (
        <mesh key={y} position={[0, y, 0.07]}>
          <boxGeometry args={[1.82, 0.62, 0.02]} />
          <meshStandardMaterial color="#f1f3f7" roughness={0.6} />
        </mesh>
      ))}
      {[-0.7, 0.7].map((x) => (
        <mesh key={x} position={[x, 1.32, 0.09]}>
          <boxGeometry args={[0.16, 0.06, 0.03]} />
          <meshStandardMaterial color="#5b6273" metalness={0.6} roughness={0.35} />
        </mesh>
      ))}
      {/* status LEDs */}
      <mesh position={[0.78, 1.32, 0.1]}>
        <sphereGeometry args={[0.025, 8, 8]} />
        <meshStandardMaterial color="#7dd3a7" emissive="#7dd3a7" emissiveIntensity={3} toneMapped={false} />
      </mesh>
      {glow > 0 && (
        <mesh position={[0, 0, 0.1]}>
          <planeGeometry args={[2, 3]} />
          <meshBasicMaterial color="#ff7a3c" transparent opacity={glow * 0.35} blending={THREE.AdditiveBlending} depthWrite={false} />
        </mesh>
      )}
    </group>
  )
}

const flameVertex = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vLocal;
uniform float uTime;
void main() {
  vec3 p = position;
  float wob = 0.035 * sin(uTime * 3.1 + position.y * 6.0) + 0.025 * sin(uTime * 5.3 + position.x * 8.0);
  p *= 1.0 + wob;
  vec4 viewPosition = modelViewMatrix * vec4(p, 1.0);
  vNormal = normalize(normalMatrix * normal);
  vView = -viewPosition.xyz;
  vLocal = p;
  gl_Position = projectionMatrix * viewPosition;
}`

const flameFragment = /* glsl */ `
varying vec3 vNormal;
varying vec3 vView;
varying vec3 vLocal;
uniform float uTime;
uniform float uHeat;
void main() {
  float facing = max(0.0, dot(normalize(vView), normalize(vNormal)));
  float rim = exp(-18.0 * pow(facing - 0.45, 2.0));
  float core = pow(facing, 3.0);
  float ripple = 0.8 + 0.2 * sin(9.0 * vLocal.x + 13.0 * vLocal.y + uTime * 4.0);
  vec3 blue = mix(vec3(0.16, 0.38, 1.0), vec3(0.78, 0.93, 1.0), core);
  // a hotter (1g-like / oxygen-rich) flame gets a yellow soot tip
  vec3 col = mix(blue, vec3(1.0, 0.72, 0.32), uHeat * smoothstep(0.1, 0.9, vLocal.y + 0.4) * 0.8);
  float a = (0.08 + rim * ripple * 0.75 + core * 0.7) * smoothstep(0.02, 0.35, facing + 0.2);
  gl_FragColor = vec4(col * 1.6, a);
}`

/** Spherical microgravity flame: diffusion-fed, no buoyant teardrop. */
export function MicroFlame({ size = 1, heat = 0, position = [0, 0, 0] as [number, number, number] }: { size?: number; heat?: number; position?: [number, number, number] }) {
  const mat = useRef<THREE.ShaderMaterial>(null)
  const group = useRef<THREE.Group>(null)
  const uniforms = useMemo(() => ({ uTime: { value: 0 }, uHeat: { value: 0 } }), [])
  useFrame(({ clock }, dt) => {
    const u = mat.current?.uniforms
    if (u) {
      u.uTime.value = clock.elapsedTime
      u.uHeat.value += (heat - u.uHeat.value) * Math.min(1, dt * 3)
    }
    const g = group.current
    if (g) {
      const s = g.scale.x + (size - g.scale.x) * Math.min(1, dt * 4)
      g.scale.setScalar(Math.max(0.0001, s))
      g.visible = s > 0.01
    }
  })
  return (
    <group ref={group} position={position} scale={0.0001}>
      <mesh>
        <sphereGeometry args={[0.5, 48, 32]} />
        <shaderMaterial ref={mat} vertexShader={flameVertex} fragmentShader={flameFragment} uniforms={uniforms}
          transparent depthWrite={false} blending={THREE.AdditiveBlending} toneMapped={false} />
      </mesh>
      <mesh scale={0.35}>
        <sphereGeometry args={[0.5, 24, 16]} />
        <meshBasicMaterial color="#cfe9ff" transparent opacity={0.65} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
      </mesh>
      <pointLight color="#6cb8ff" intensity={2.2 * size} distance={4} />
    </group>
  )
}

/** Faint streaks showing the ventilation airflow along +x. */
export function Airflow({ on = true, count = 140, speed = 1.6, color = '#9fd4ff' }: { on?: boolean; count?: number; speed?: number; color?: string }) {
  const points = useRef<THREE.Points>(null)
  const data = useMemo(() => {
    const r = seeded(count)
    const pos = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (r() - 0.5) * MODULE_LENGTH
      pos[i * 3 + 1] = (r() - 0.5) * HALF * 1.7
      pos[i * 3 + 2] = (r() - 0.5) * HALF * 1.7
    }
    return pos
  }, [count])
  const mat = useRef<THREE.PointsMaterial>(null)
  useFrame((_, dt) => {
    const p = points.current
    if (!p) return
    const arr = p.geometry.attributes.position.array as Float32Array
    if (on) {
      for (let i = 0; i < count; i++) {
        arr[i * 3] += speed * dt * (0.7 + (i % 5) * 0.08)
        if (arr[i * 3] > MODULE_LENGTH / 2) arr[i * 3] = -MODULE_LENGTH / 2
      }
      p.geometry.attributes.position.needsUpdate = true
    }
    if (mat.current) mat.current.opacity += ((on ? 0.55 : 0) - mat.current.opacity) * Math.min(1, dt * 2)
  })
  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[data, 3]} />
      </bufferGeometry>
      <pointsMaterial ref={mat} color={color} size={0.035} transparent opacity={0.55} depthWrite={false} sizeAttenuation />
    </points>
  )
}
