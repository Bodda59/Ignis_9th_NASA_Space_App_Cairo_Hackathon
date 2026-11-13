/** Experiment hardware described in the 2026 challenge brief (Potential considerations › Hardware).
 *  Study ids are the research catalog ids (backend/data_pipeline/sources/investigations.json). */
export type RackId = 'cir' | 'msg'

export const RACKS: Record<RackId, { name: string; short: string; text: string; studies: { id: string; acronym: string }[] }> = {
  cir: {
    name: 'Combustion Integrated Rack',
    short: 'CIR',
    text: 'Hosted ACME’s gaseous-flame experiments on one modular set of hardware, and the burning-droplet studies run in the Multi-user Droplet Combustion Apparatus (MDCA).',
    studies: [
      { id: 'PSI-20', acronym: 'BRE' },
      { id: 'PSI-159', acronym: 'CFI-G' },
      { id: 'PSI-22', acronym: 'E-FIELD' },
      { id: 'PSI-69', acronym: 'FLEX' },
      { id: 'PSI-68', acronym: 'FLEX-2' },
      { id: 'PSI-39', acronym: 'CFI' },
    ],
  },
  msg: {
    name: 'Microgravity Science Glovebox',
    short: 'MSG',
    text: 'Housed the modular fan-driven flow duct built for SPICE, later reused for solid- and gaseous-fuel studies.',
    studies: [
      { id: 'PSI-107', acronym: 'SPICE' },
      { id: 'PSI-106', acronym: 'SLICE' },
      { id: 'PSI-26', acronym: 'BASS' },
      { id: 'PSI-25', acronym: 'BASS-II' },
    ],
  },
}
