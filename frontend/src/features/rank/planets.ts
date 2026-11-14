import type { HabitatId } from '@/api/types'

/**
 * Bodies in the Rank hero, sized by true mean diameter (Earth = 1 unit radius).
 * Diameters and surface gravity are standard NASA fact-sheet values.
 */
export type Body = {
  id: 'earth' | 'mars' | 'moon'
  name: string
  /** Radius in Earth radii. */
  r: number
  /** Centre x in scene units (laid out left to right with equal gaps). */
  x: number
  diameterKm: number
  gravity: string
  note: string
  texture: string
  atmosphere?: string
  tilt: number
  spin: number
  /** Starting turn so a recognisable side faces the viewer. */
  turn: number
}

const GAP = 0.72
const R = { earth: 1, mars: 6779 / 12742, moon: 3475 / 12742 }
const width = 2 * (R.earth + R.mars + R.moon) + 2 * GAP
const earthX = -width / 2 + R.earth
const marsX = earthX + R.earth + GAP + R.mars
const moonX = marsX + R.mars + GAP + R.moon

/** SphereGeometry puts 90°W toward the viewer; this turns `lon` (degrees east) to face it instead. */
const facing = (lon: number) => Math.PI / 2 - ((lon + 180) / 360) * Math.PI * 2

export const BODIES: Body[] = [
  { id: 'earth', name: 'Earth', r: R.earth, x: earthX, diameterKm: 12742, gravity: '1 g', note: 'Ground tests and drop towers',
    texture: '/textures/earth/day.jpg', atmosphere: '#6cc8ff', tilt: -0.41, spin: 0.06, turn: facing(15) },
  { id: 'mars', name: 'Mars', r: R.mars, x: marsX, diameterKm: 6779, gravity: '0.38 g', note: 'Red planet',
    texture: '/textures/mars/color.jpg', atmosphere: '#ffb07a', tilt: -0.44, spin: 0.08, turn: facing(-60) },
  { id: 'moon', name: 'Moon', r: R.moon, x: moonX, diameterKm: 3475, gravity: '0.17 g', note: 'Our nearest neighbour',
    texture: '/textures/moon/color.jpg', tilt: -0.03, spin: 0.05, turn: facing(0) },
]

const [earth, mars, moon] = BODIES

/** Point on a body's surface at `deg` from the top, clockwise (scene units). */
const onSurface = (b: Body, deg: number, lift = 0) => {
  const a = (deg * Math.PI) / 180
  return { x: b.x + Math.sin(a) * (b.r + lift), y: Math.cos(a) * (b.r + lift), angle: -a }
}

export const ISS_ORBIT = earth.r * 1.16

/**
 * Craft and bases for each crew environment the Rank page supports. Models are drawn far larger
 * than real scale so they can be seen; positions are in scene units.
 */
export type Craft = {
  id: 'station' | 'spacecraft' | 'mars_base' | 'rover' | 'lunar_base'
  habitat: HabitatId
  name: string
  note: string
  x: number
  y: number
  /** Rotation so surface models stand on the ground. */
  angle: number
  /** Where the label sits relative to the model. */
  label: 'above' | 'right'
}

const stationAt = { x: earth.x + Math.sin(-0.62) * ISS_ORBIT, y: Math.cos(-0.62) * ISS_ORBIT }
const marsTop = onSurface(mars, 0, 0.02)
const roverAt = onSurface(moon, 72, 0.01)
const moonTop = onSurface(moon, 0, 0.01)

export const CRAFT: Craft[] = [
  { id: 'station', habitat: 'space_station', name: 'Space station', note: 'Microgravity', ...stationAt, angle: -0.2, label: 'above' },
  { id: 'spacecraft', habitat: 'spacecraft', name: 'Spacecraft', note: 'Crew capsule on the way to Mars', x: (earth.x + mars.x) / 2 + 0.35, y: 1.3, angle: -0.35, label: 'above' },
  { id: 'mars_base', habitat: 'mars_base', name: 'Mars base', note: '0.38 g', x: marsTop.x, y: marsTop.y, angle: marsTop.angle, label: 'above' },
  { id: 'rover', habitat: 'pressurized_rover', name: 'Pressurized rover', note: 'Driving on the Moon', x: roverAt.x, y: roverAt.y, angle: roverAt.angle, label: 'right' },
  { id: 'lunar_base', habitat: 'lunar_base', name: 'Lunar base', note: '0.17 g', x: moonTop.x, y: moonTop.y, angle: moonTop.angle, label: 'above' },
]

/** Scene size in Earth radii that must fit in the box (craft above, labels below). */
export const SCENE_W = width + 1.9
/** Shift the planets left (Earth radii) to leave room for the rover label on the right. */
export const OFFSET_X = -0.55
export const SCENE_H = 2 * earth.r + 1.5
/** Vertical offset of the planets' centre line, in Earth radii (positive = lower). */
export const CENTRE_DROP = 0.18
