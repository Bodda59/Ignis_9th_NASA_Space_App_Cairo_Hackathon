import { useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import * as THREE from 'three'

type Vec3 = [number, number, number]

/**
 * First-person zero-gravity camera: drag to look, WASD / arrow keys to drift,
 * Q / E (or Space / Shift) to move down / up, R to reset. Motion has inertia
 * like floating in a module, and the camera is kept inside `bounds`.
 * Keys are ignored while a form control has focus, so sliders keep working.
 */
export function ZeroGRig({ start, look, bounds = [6.4, 1.3, 1.3], enabled = true, reduced = false }: {
  start: Vec3; look: Vec3; bounds?: Vec3; enabled?: boolean; reduced?: boolean
}) {
  const { camera, gl } = useThree()
  const yaw = useRef(0)
  const pitch = useRef(0)
  const vel = useRef(new THREE.Vector3())
  const keys = useRef(new Set<string>())
  const euler = useRef(new THREE.Euler(0, 0, 0, 'YXZ'))
  // the pose a scene starts in (and R resets to); captured once so re-renders never snap the camera
  const pose = useRef({ start, look })

  useEffect(() => {
    const reset = () => {
      camera.position.set(...pose.current.start)
      const dir = new THREE.Vector3(...pose.current.look).sub(camera.position).normalize()
      yaw.current = Math.atan2(-dir.x, -dir.z)
      pitch.current = Math.asin(THREE.MathUtils.clamp(dir.y, -1, 1))
      vel.current.set(0, 0, 0)
    }
    reset()
    const el = gl.domElement
    let dragging = false
    let lx = 0
    let ly = 0
    const down = (e: PointerEvent) => { dragging = true; lx = e.clientX; ly = e.clientY }
    const move = (e: PointerEvent) => {
      if (!dragging || !enabled) return
      yaw.current -= (e.clientX - lx) * 0.0032
      pitch.current = THREE.MathUtils.clamp(pitch.current - (e.clientY - ly) * 0.0032, -1.2, 1.2)
      lx = e.clientX; ly = e.clientY
    }
    const up = () => { dragging = false }
    const typing = (t: EventTarget | null) => t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName))
    const kd = (e: KeyboardEvent) => {
      if (!enabled || typing(e.target)) return
      const k = e.key.toLowerCase()
      if (k === 'r') { reset(); return }
      if (['w', 'a', 's', 'd', 'q', 'e', ' ', 'shift', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(k)) {
        // only steal arrows/space when the 3D view area is what the user is working with
        if (k.startsWith('arrow') || k === ' ') e.preventDefault()
        keys.current.add(k)
      }
    }
    const ku = (e: KeyboardEvent) => keys.current.delete(e.key.toLowerCase())
    const blur = () => keys.current.clear()
    el.addEventListener('pointerdown', down)
    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', up)
    window.addEventListener('keydown', kd)
    window.addEventListener('keyup', ku)
    window.addEventListener('blur', blur)
    return () => {
      el.removeEventListener('pointerdown', down)
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', up)
      window.removeEventListener('keydown', kd)
      window.removeEventListener('keyup', ku)
      window.removeEventListener('blur', blur)
    }
  }, [camera, gl, enabled])

  useFrame(({ clock }, dt) => {
    const k = keys.current
    const f = (k.has('w') || k.has('arrowup') ? 1 : 0) - (k.has('s') || k.has('arrowdown') ? 1 : 0)
    const r = (k.has('d') || k.has('arrowright') ? 1 : 0) - (k.has('a') || k.has('arrowleft') ? 1 : 0)
    const u = (k.has('e') || k.has(' ') ? 1 : 0) - (k.has('q') || k.has('shift') ? 1 : 0)
    euler.current.set(pitch.current, yaw.current, 0)
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(euler.current)
    const right = new THREE.Vector3(1, 0, 0).applyEuler(euler.current)
    const accel = new THREE.Vector3().addScaledVector(forward, f).addScaledVector(right, r).addScaledVector(new THREE.Vector3(0, 1, 0), u)
    const step = Math.min(dt, 0.05)
    vel.current.addScaledVector(accel, 3.2 * step)
    vel.current.multiplyScalar(Math.pow(0.12, step)) // zero-g drag: drift, then settle
    camera.position.addScaledVector(vel.current, step)
    const [bx, by, bz] = bounds
    camera.position.set(
      THREE.MathUtils.clamp(camera.position.x, -bx, bx),
      THREE.MathUtils.clamp(camera.position.y, -by, by),
      THREE.MathUtils.clamp(camera.position.z, -bz, bz),
    )
    // gentle weightless sway
    const sway = reduced ? 0 : Math.sin(clock.elapsedTime * 0.6) * 0.012
    euler.current.set(pitch.current + sway, yaw.current, sway * 0.6)
    camera.quaternion.setFromEuler(euler.current)
  })
  return null
}
