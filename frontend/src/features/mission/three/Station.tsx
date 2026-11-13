import { Canvas } from '@react-three/fiber'
import { Suspense, type ReactNode } from 'react'
import * as THREE from 'three'
import { CabinLighting, Effects, ModuleInterior } from './parts'
import { Crewmate, EarthWindow, FloatingCargo, StationDressing } from './props'
import { ZeroGRig } from './ZeroGRig'

type Vec3 = [number, number, number]

/**
 * One furnished ISS-style module with a first-person zero-g camera.
 * Each level adds its own interactive objects as children.
 */
export function StationCanvas({ children, start, look, alarm = 0, reduced, crewmate = [-4.9, 0.1, 0.55], avoid, bloom = 1 }: {
  children?: ReactNode; start: Vec3; look: Vec3; alarm?: number; reduced: boolean
  crewmate?: Vec3 | null; avoid?: (p: THREE.Vector3) => boolean; bloom?: number
}) {
  return (
    <Canvas camera={{ position: start, fov: 66, near: 0.05, far: 60 }} dpr={[1, 1.75]} gl={{ antialias: true }}
      onCreated={({ gl }) => { gl.toneMapping = THREE.ACESFilmicToneMapping; gl.toneMappingExposure = 1.05 }}>
      <color attach="background" args={['#05070c']} />
      <fog attach="fog" args={['#0a0d15', 7, 17]} />
      <CabinLighting alarm={alarm} />
      <ModuleInterior />
      <EarthWindow position={[-1.15, 0.2, 1.6]} rotation={[0, Math.PI, 0]} reduced={reduced} />
      <Suspense fallback={null}>
        <StationDressing />
        <FloatingCargo count={7} reduced={reduced} avoid={avoid} />
        {crewmate && <Crewmate position={crewmate} reduced={reduced} />}
      </Suspense>
      {children}
      <ZeroGRig start={start} look={look} reduced={reduced} />
      <Effects bloom={bloom} />
    </Canvas>
  )
}
