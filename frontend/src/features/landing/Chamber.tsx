import { RoundedBox } from '@react-three/drei'
import { CatmullRomCurve3, DoubleSide, Vector3 } from 'three'

type XYZ = [number, number, number]

const finishes = {
  chassis: { color: '#263747', metalness: 0.63, roughness: 0.48 },
  aluminum: { color: '#9ba8b4', metalness: 0.76, roughness: 0.32 },
  gasket: { color: '#10151b', metalness: 0.12, roughness: 0.8 },
}

function Plate({ at, size, finish = 'chassis' }: {
  at: XYZ; size: XYZ; finish?: keyof typeof finishes
}) {
  return (
    <RoundedBox position={at} args={size} radius={0.045} smoothness={2}>
      <meshStandardMaterial {...finishes[finish]} />
    </RoundedBox>
  )
}

const cables = [
  new CatmullRomCurve3([[-2.92, 0.25, 0.15], [-3.55, 0.36, 0.43], [-3.65, -0.52, 1.15], [-3.1, -1.28, 1.42]].map(p => new Vector3(...p))),
  new CatmullRomCurve3([[1.14, 1.7, -0.55], [1.65, 2.12, -0.91], [2.44, 1.58, -1.45], [2.64, 0.71, -1.38]].map(p => new Vector3(...p))),
]

const fasteners: XYZ[] = [
  ...[-2.61, -1.54, -0.5, 0.5, 1.54, 2.61].flatMap(x => [-0.91, 0.91].map(y => [x, y, 1.33] as XYZ)),
  ...[-2.61, 2.61].flatMap(x => [-0.47, 0, 0.47].map(y => [x, y, 1.33] as XYZ)),
]

export function Chamber() {
  return (
    <group>
      <Plate at={[0, -1.18, 0]} size={[6.65, 0.23, 3.08]} finish="aluminum" />
      <Plate at={[0, -1.37, 0]} size={[7.15, 0.16, 3.34]} finish="gasket" />
      <Plate at={[0, 0, -1.17]} size={[5.8, 2.12, 0.22]} />
      <Plate at={[-2.84, 0, 0]} size={[0.29, 2.12, 2.45]} />
      <Plate at={[2.84, 0, 0]} size={[0.29, 2.12, 2.45]} />
      {[-1.03, 1.03].map(z => (
        <Plate key={z} at={[0, 1.1, z]} size={[5.98, 0.18, 0.45]} />
      ))}
      {[-2.71, 2.71].map(x => (
        <Plate key={x} at={[x, 1.1, 0]} size={[0.5, 0.18, 1.76]} />
      ))}
      <mesh position={[0, 1.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <planeGeometry args={[4.96, 1.63]} />
        <meshPhysicalMaterial color="#acc9e0" metalness={0.25} roughness={0.16} transparent opacity={0.18} side={DoubleSide} depthWrite={false} />
      </mesh>

      {[-0.91, 0.91].map(y => (
        <group key={y}>
          <Plate at={[0, y, 1.2]} size={[5.65, 0.25, 0.25]} finish="aluminum" />
          <Plate at={[0, y * 0.83, 1.21]} size={[5.25, 0.07, 0.08]} finish="gasket" />
        </group>
      ))}
      {[-2.61, 2.61].map(x => (
        <group key={x}>
          <Plate at={[x, 0, 1.2]} size={[0.25, 1.76, 0.25]} finish="aluminum" />
          <Plate at={[x, -0.44, 1.37]} size={[0.13, 0.48, 0.1]} />
        </group>
      ))}
      {fasteners.map(([x, y, z]) => (
        <mesh key={`${x}/${y}`} position={[x, y, z]} rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[0.039, 0.045, 0.032, 6]} />
          <meshStandardMaterial color="#e1e9ee" metalness={0.75} roughness={0.26} />
        </mesh>
      ))}
      <mesh position={[0, 0, 1.18]}>
        <planeGeometry args={[5.04, 1.48]} />
        <meshPhysicalMaterial color="#9bbfd8" metalness={0.33} roughness={0.14} transparent opacity={0.13} depthWrite={false} />
      </mesh>

      <group position={[-3.1, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <Plate at={[0, 0, 0]} size={[2.25, 1.77, 0.48]} finish="gasket" />
        <mesh position={[0, 0, 0.26]}>
          <torusGeometry args={[0.67, 0.06, 10, 48]} />
          <meshStandardMaterial {...finishes.aluminum} />
        </mesh>
        {Array.from({ length: 7 }, (_, i) => (i - 3) * 0.17).map(y => (
          <Plate key={y} at={[0, y, 0.29]} size={[2 * Math.sqrt(0.62 ** 2 - y ** 2), 0.055, 0.07]} />
        ))}
      </group>

      <Plate at={[0.7, 1.45, -0.27]} size={[0.88, 0.59, 0.79]} finish="gasket" />
      <Plate at={[0.7, 1.76, -0.27]} size={[0.73, 0.09, 0.65]} />
      <mesh position={[0.7, 1.16, -0.27]}>
        <cylinderGeometry args={[0.21, 0.26, 0.28, 32]} />
        <meshStandardMaterial {...finishes.aluminum} />
      </mesh>
      {cables.map((path, i) => (
        <mesh key={i}>
          <tubeGeometry args={[path, 24, 0.045, 8, false]} />
          <meshStandardMaterial color={i === 0 ? '#bd9354' : '#3e4c5a'} roughness={0.52} />
        </mesh>
      ))}

      <Plate at={[0.55, -0.94, 0.1]} size={[2.68, 0.18, 1.2]} />
      <Plate at={[0.55, -0.59, 0.1]} size={[2.22, 0.47, 0.74]} finish="gasket" />
      <Plate at={[0.53, -0.31, 0.1]} size={[2.07, 0.1, 0.62]} finish="aluminum" />
      <mesh position={[0.42, -0.224, 0.1]}>
        <boxGeometry args={[1.57, 0.062, 0.43]} />
        <meshPhysicalMaterial color="#b5af9f" roughness={0.42} clearcoat={0.34} />
      </mesh>
      <mesh position={[-0.2, -0.183, 0.11]}>
        <boxGeometry args={[0.31, 0.018, 0.38]} />
        <meshStandardMaterial color="#392923" roughness={0.9} />
      </mesh>
      <mesh position={[2.3, -0.58, 1.343]}>
        <boxGeometry args={[0.105, 0.037, 0.025]} />
        <meshBasicMaterial color="#7de6c6" />
      </mesh>
    </group>
  )
}
