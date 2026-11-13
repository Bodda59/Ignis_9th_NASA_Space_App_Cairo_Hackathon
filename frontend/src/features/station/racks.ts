/** Experiment hardware described in the 2026 challenge brief (Potential considerations › Hardware). */
export type RackId = 'cir' | 'msg'

export const RACKS: Record<RackId, { name: string; short: string; text: string; studies: { id: string; acronym: string }[] }> = {
  cir: {
    name: 'Combustion Integrated Rack',
    short: 'CIR',
    text: 'Hosted ACME’s gaseous-flame experiments on one modular set of hardware, and the burning-droplet studies run in the Multi-user Droplet Combustion Apparatus (MDCA).',
    studies: [
      { id: 'acme-bre', acronym: 'BRE' },
      { id: 'acme-cfi-g', acronym: 'CFI-G' },
      { id: 'acme-e-field', acronym: 'E-FIELD' },
      { id: 'flex', acronym: 'FLEX' },
      { id: 'flex-2', acronym: 'FLEX-2' },
      { id: 'cfi', acronym: 'CFI' },
    ],
  },
  msg: {
    name: 'Microgravity Science Glovebox',
    short: 'MSG',
    text: 'Housed the modular fan-driven flow duct built for SPICE, later reused for solid- and gaseous-fuel studies.',
    studies: [
      { id: 'spice', acronym: 'SPICE' },
      { id: 'slice', acronym: 'SLICE' },
      { id: 'bass', acronym: 'BASS' },
      { id: 'bass-ii', acronym: 'BASS-II' },
    ],
  },
}
