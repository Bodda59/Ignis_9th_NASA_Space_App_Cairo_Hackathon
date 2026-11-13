import { useEffect, useRef } from 'react'

/**
 * Real-time WebGL flame that morphs between a buoyant 1g teardrop
 * and a diffusion-fed microgravity sphere.
 *
 * Illustrative only: it visualizes the qualitative shape difference described
 * in the challenge brief. It is NOT a combustion simulation and shows no data.
 */
type Props = {
  /** 1 = Earth gravity (teardrop), 0 = microgravity (sphere) */
  gravity: number
  className?: string
}

const VERT = `
attribute vec2 a_pos;
void main() { gl_Position = vec4(a_pos, 0.0, 1.0); }
`

const FRAG = `
precision highp float;
uniform vec2  u_res;
uniform float u_time;
uniform float u_g;
uniform vec2  u_mouse;

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }
float noise(vec2 p) {
  vec2 i = floor(p), f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1, 0)), u.x),
             mix(hash(i + vec2(0, 1)), hash(i + vec2(1, 1)), u.x), u.y);
}
float fbm(vec2 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * noise(p); p *= 2.03; a *= 0.5; }
  return v;
}

void main() {
  vec2 p = (gl_FragCoord.xy - 0.5 * u_res) / min(u_res.x, u_res.y);
  float g = u_g;
  float t = u_time;

  // gentle "airflow" from the cursor — tiny lean, stronger in 1g
  p -= u_mouse * 0.04 * (0.4 + g);

  // ── μg: diffusion-fed spherical flame (thin blue/violet shell) ──────
  vec2 q = p;
  float n = fbm(vec2(q.x * 3.0, q.y * 2.5 - t * 0.15));
  q += (n - 0.5) * 0.035;
  float r = length(q);
  float R = (0.25 + 0.012 * sin(t * 1.3)) * (1.0 - 0.35 * g); // sphere grows out of the collapsing plume
  float shell = exp(-pow((r - R) / 0.038, 2.0));
  float bloom = exp(-pow((r - R) / 0.11, 2.0)) * 0.22;
  float ugI = shell * 1.25 + smoothstep(R, 0.0, r) * 0.16 + bloom;
  float rim = 0.5 + 0.5 * sin(atan(q.y, q.x) + t * 0.35); // seamless
  vec3 colUg = mix(vec3(0.36, 0.74, 1.0), vec3(0.50, 0.38, 1.0), rim * 0.6 + n * 0.3) * ugI;
  colUg += exp(-length(p) * 3.2) * 0.28 * vec3(0.32, 0.36, 1.0);

  // ── 1g: candle-like teardrop (round base, pointed flickering tip) ───
  vec2 c = p - vec2(0.0, -0.17);                       // wick position
  // as gravity drops the plume collapses toward the sphere
  float H = 0.54 * (0.35 + 0.65 * g) * (1.0 + 0.05 * sin(t * 3.1) + 0.04 * sin(t * 7.3));
  float s = c.y / H;                                    // 0 at base → 1 at tip
  float sc = clamp(s, 0.0, 1.0);
  // flicker grows toward the tip; slow sway of the whole plume
  float fn = fbm(vec2(sc * 3.0 - t * 2.6, t * 0.8));
  c.x -= (fn - 0.5) * 0.12 * sc * sc + sin(t * 1.7) * 0.012 * sc;
  // width profile: sqrt gives a round bottom, (1-s)^1.25 a sharp tip
  float w = 0.30 * sqrt(sc) * pow(1.0 - sc, 1.4) + 1e-4;
  float f = abs(c.x) / w;                               // <1 inside the flame
  float ends = smoothstep(-0.02, 0.06, s) * smoothstep(1.02, 0.80, s);
  float body = smoothstep(1.0, 0.45, f) * ends;
  float core = smoothstep(1.0, 0.15, abs(c.x) / (w * 0.5)) * smoothstep(0.10, 0.32, s) * smoothstep(0.80, 0.42, s);
  float blueBase = smoothstep(1.05, 0.65, f) * smoothstep(0.30, 0.04, s) * step(-0.02, s);
  float dark = smoothstep(0.7, 0.0, f) * smoothstep(0.30, 0.08, s);  // cooler vapour zone above the wick

  vec3 orange = vec3(1.00, 0.46, 0.12);
  vec3 yellow = vec3(1.00, 0.76, 0.34);
  vec3 white  = vec3(1.00, 0.95, 0.84);
  vec3 col1g = orange * body * 0.85;
  col1g = mix(col1g, yellow, body * smoothstep(0.95, 0.30, f) * 0.9);
  col1g = mix(col1g, white, core * 0.9);
  col1g *= 1.0 - dark * 0.55;
  col1g += vec3(0.22, 0.48, 1.0) * blueBase * 0.95;
  // outer glow hugging the flame + warm room halo
  float glow = exp(-max(f - 1.0, 0.0) * 1.6) * smoothstep(-0.05, 0.25, s) * smoothstep(1.3, 0.5, s) * 0.22;
  col1g += glow * vec3(1.0, 0.5, 0.18);
  col1g += exp(-length(p - vec2(0.0, 0.05)) * 3.6) * 0.22 * vec3(1.0, 0.45, 0.16);

  vec3 col = mix(colUg, col1g, g);

  // fade to transparent well before the canvas edge (no visible box)
  vec2 uv = gl_FragCoord.xy / u_res;
  float edge = smoothstep(0.0, 0.22, uv.x) * smoothstep(1.0, 0.78, uv.x)
             * smoothstep(0.0, 0.22, uv.y) * smoothstep(1.0, 0.78, uv.y);
  col *= edge;

  float a = clamp(max(col.r, max(col.g, col.b)), 0.0, 1.0);
  gl_FragColor = vec4(col, a);
}
`

function compile(gl: WebGLRenderingContext, type: number, src: string) {
  const s = gl.createShader(type)!
  gl.shaderSource(s, src)
  gl.compileShader(s)
  if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
    console.warn(gl.getShaderInfoLog(s))
  }
  return s
}

export function FlameCanvas({ gravity, className }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const target = useRef(gravity)
  useEffect(() => {
    target.current = gravity
  }, [gravity])

  useEffect(() => {
    const canvas = canvasRef.current!
    const gl = canvas.getContext('webgl', { premultipliedAlpha: true, antialias: true })
    if (!gl) return

    const prog = gl.createProgram()!
    gl.attachShader(prog, compile(gl, gl.VERTEX_SHADER, VERT))
    gl.attachShader(prog, compile(gl, gl.FRAGMENT_SHADER, FRAG))
    gl.linkProgram(prog)
    gl.useProgram(prog)

    const buf = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, buf)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW)
    const loc = gl.getAttribLocation(prog, 'a_pos')
    gl.enableVertexAttribArray(loc)
    gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0)

    const uRes = gl.getUniformLocation(prog, 'u_res')
    const uTime = gl.getUniformLocation(prog, 'u_time')
    const uG = gl.getUniformLocation(prog, 'u_g')
    const uMouse = gl.getUniformLocation(prog, 'u_mouse')

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let g = target.current
    const mouse = { x: 0, y: 0, tx: 0, ty: 0 }
    let raf = 0
    let visible = true
    const start = performance.now()

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, 2)
      const { width, height } = canvas.getBoundingClientRect()
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      gl.viewport(0, 0, canvas.width, canvas.height)
    }
    const ro = new ResizeObserver(resize)
    ro.observe(canvas)
    resize()

    const onMove = (e: PointerEvent) => {
      const r = canvas.getBoundingClientRect()
      mouse.tx = ((e.clientX - r.left) / r.width - 0.5) * 2
      mouse.ty = -((e.clientY - r.top) / r.height - 0.5) * 2
    }
    window.addEventListener('pointermove', onMove)

    const io = new IntersectionObserver(([e]) => {
      visible = e.isIntersecting
      if (visible) loop()
    })
    io.observe(canvas)

    function loop() {
      cancelAnimationFrame(raf)
      if (!visible) return
      g += (target.current - g) * (reduced ? 1 : 0.035)
      mouse.x += (mouse.tx - mouse.x) * 0.05
      mouse.y += (mouse.ty - mouse.y) * 0.05
      const t = reduced ? 2 : (performance.now() - start) / 1000
      gl!.uniform2f(uRes, canvas.width, canvas.height)
      gl!.uniform1f(uTime, t)
      gl!.uniform1f(uG, g)
      gl!.uniform2f(uMouse, mouse.x, mouse.y)
      gl!.clearColor(0, 0, 0, 0)
      gl!.clear(gl!.COLOR_BUFFER_BIT)
      gl!.drawArrays(gl!.TRIANGLE_STRIP, 0, 4)
      raf = requestAnimationFrame(loop)
    }
    loop()

    return () => {
      cancelAnimationFrame(raf)
      ro.disconnect()
      io.disconnect()
      window.removeEventListener('pointermove', onMove)
      gl.deleteProgram(prog)
      gl.deleteBuffer(buf)
    }
  }, [])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
