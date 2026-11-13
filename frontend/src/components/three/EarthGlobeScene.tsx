import { useEffect, useMemo, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useTexture } from '@react-three/drei'
import { BackSide, Vector3, type Group, type Mesh, type ShaderMaterial } from 'three'

export type EarthGlobeProps = {
  /** Tilt toward the pointer anywhere on the page. */
  interactive?: boolean
  /** Longitude (degrees east) facing the viewer at start. */
  longitude?: number
  /** Direction the sunlight comes from, in view space. */
  sun?: [number, number, number]
  /** Auto-rotation speed, radians per second. */
  spin?: number
}

const TEXTURES = ['/textures/earth/day.jpg', '/textures/earth/night.jpg', '/textures/earth/water.jpg']

const surfaceVertex = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vPos;
  void main() {
    vUv = uv;
    vPos = position;
    vNormalV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`

// Day/night blend, ocean glint, drifting procedural clouds and an atmosphere rim.
const surfaceFragment = /* glsl */ `
  uniform sampler2D dayMap;
  uniform sampler2D nightMap;
  uniform sampler2D waterMap;
  uniform vec3 sunDir;
  uniform float time;
  varying vec2 vUv;
  varying vec3 vNormalV;
  varying vec3 vPos;

  float hash(vec3 p) { return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }
  float noise(vec3 p) {
    vec3 i = floor(p), f = fract(p);
    f = f * f * (3.0 - 2.0 * f);
    return mix(mix(mix(hash(i), hash(i + vec3(1,0,0)), f.x), mix(hash(i + vec3(0,1,0)), hash(i + vec3(1,1,0)), f.x), f.y),
               mix(mix(hash(i + vec3(0,0,1)), hash(i + vec3(1,0,1)), f.x), mix(hash(i + vec3(0,1,1)), hash(i + vec3(1,1,1)), f.x), f.y), f.z);
  }
  float fbm(vec3 p) {
    float v = 0.0, a = 0.5;
    for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
    return v;
  }

  void main() {
    vec3 n = normalize(vNormalV);
    vec3 view = vec3(0.0, 0.0, 1.0);
    float light = dot(n, sunDir);
    float dayMix = smoothstep(-0.18, 0.22, light);

    vec3 day = texture2D(dayMap, vUv).rgb * (0.18 + 1.05 * max(light, 0.0));
    vec3 night = texture2D(nightMap, vUv).rgb;
    night = pow(night, vec3(1.4)) * vec3(1.0, 0.78, 0.5) * 2.2;
    vec3 color = mix(night, day, dayMix);

    float water = texture2D(waterMap, vUv).r;
    vec3 h = normalize(sunDir + view);
    color += vec3(0.75, 0.88, 1.0) * pow(max(dot(n, h), 0.0), 120.0) * water * 0.35 * dayMix;

    vec3 q = vPos * 2.4 + vec3(time * 0.012, 0.0, time * 0.006);
    float cloud = smoothstep(0.52, 0.82, fbm(q + fbm(q * 1.7)));
    color = mix(color, vec3(0.95) * (0.12 + 0.95 * max(light, 0.0)), cloud * 0.3 * smoothstep(-0.3, 0.2, light));

    float rim = pow(1.0 - max(dot(n, view), 0.0), 2.6);
    color += vec3(0.42, 0.78, 1.0) * rim * (0.15 + 0.85 * smoothstep(-0.4, 0.4, light));
    gl_FragColor = vec4(color, 1.0);
  }
`

const haloVertex = /* glsl */ `
  varying vec3 vNormalV;
  void main() {
    vNormalV = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`
const haloFragment = /* glsl */ `
  uniform vec3 sunDir;
  varying vec3 vNormalV;
  void main() {
    vec3 n = normalize(vNormalV);
    // Back faces: 0 at the halo's outer silhouette, ~0.42 just outside Earth's limb (shell scale 1.1).
    float t = clamp(-dot(n, vec3(0.0, 0.0, 1.0)) / 0.42, 0.0, 1.0);
    float glow = pow(t, 3.0);
    float lit = 0.2 + 0.8 * smoothstep(-0.5, 0.6, dot(n, sunDir));
    // Glow strength goes in alpha so the canvas stays transparent around it.
    gl_FragColor = vec4(vec3(0.42, 0.78, 1.0), clamp(glow * lit * 1.1, 0.0, 1.0));
  }
`

function reducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function Globe({ interactive, longitude, sun, spin }: Required<EarthGlobeProps>) {
  const [day, night, water] = useTexture(TEXTURES)
  const tilt = useRef<Group>(null)
  const earth = useRef<Mesh>(null)
  const material = useRef<ShaderMaterial>(null)
  const pointer = useRef({ x: 0, y: 0 })
  const still = useMemo(() => reducedMotion(), [])
  const sunDir = useMemo(() => new Vector3(...sun).normalize(), [sun])
  const uniforms = useMemo(
    () => ({ dayMap: { value: day }, nightMap: { value: night }, waterMap: { value: water }, sunDir: { value: sunDir }, time: { value: 0 } }),
    [day, night, water, sunDir],
  )
  const halo = useMemo(() => ({ sunDir: { value: sunDir } }), [sunDir])

  useEffect(() => {
    for (const t of [day, night, water]) t.anisotropy = 8
  }, [day, night, water])

  useEffect(() => {
    if (!interactive || still) return
    const move = (e: PointerEvent) => {
      pointer.current = { x: (e.clientX / window.innerWidth) * 2 - 1, y: (e.clientY / window.innerHeight) * 2 - 1 }
    }
    window.addEventListener('pointermove', move, { passive: true })
    return () => window.removeEventListener('pointermove', move)
  }, [interactive, still])

  useFrame((_, dt) => {
    const step = Math.min(dt, 0.05)
    if (material.current) material.current.uniforms.time.value += step
    if (still) return
    if (earth.current) earth.current.rotation.y += step * spin
    if (tilt.current) {
      const k = 1 - Math.exp(-step * 3)
      tilt.current.rotation.y += (pointer.current.x * 0.45 - tilt.current.rotation.y) * k
      tilt.current.rotation.x += (pointer.current.y * 0.3 - tilt.current.rotation.x) * k
    }
  })

  // SphereGeometry puts u = 0.25 (90°W) toward +z; turn the requested longitude to face the camera.
  const start = Math.PI / 2 - ((longitude + 180) / 360) * Math.PI * 2

  return (
    <group ref={tilt}>
      <group rotation={[0.18, 0, -0.41]}>
        <mesh ref={earth} rotation={[0, start, 0]}>
          <sphereGeometry args={[1, 96, 96]} />
          <shaderMaterial ref={material} uniforms={uniforms} vertexShader={surfaceVertex} fragmentShader={surfaceFragment} />
        </mesh>
      </group>
      <mesh scale={1.1}>
        <sphereGeometry args={[1, 64, 64]} />
        <shaderMaterial uniforms={halo} vertexShader={haloVertex} fragmentShader={haloFragment} side={BackSide} transparent depthWrite={false} />
      </mesh>
    </group>
  )
}

export default function EarthGlobeScene({ interactive = false, longitude = 31, sun = [-1, 0.45, 0.6], spin = 0.04 }: EarthGlobeProps) {
  return (
    <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 4.2], fov: 35 }} gl={{ alpha: true, antialias: true }}>
      <Globe interactive={interactive} longitude={longitude} sun={sun} spin={spin} />
    </Canvas>
  )
}
