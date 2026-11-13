export const challengeResources = 'https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=resources'

export const articleGroups = [
  { id: 'research', title: 'Combustion research' },
  { id: 'history', title: 'Spaceflight incidents' },
  { id: 'spinoffs', title: 'Technology spinoffs' },
] as const

export const resources = [
  {
    imageAlt: 'A rounded orange flame edged in blue against a dark background',
    id: 'combustion-science', group: 'research', kind: 'NASA Glenn overview',
    title: 'NASA Combustion Science',
    url: 'https://www.nasa.gov/glenn/glenn-expertise-space-exploration/physical-sciences-program/combustion-science/',
    summary: 'See what NASA studies when flames burn in microgravity, from droplet combustion to smoke detection.',
    takeaway: 'The overview introduces experiments such as BASS, FLEX, and SAME alongside the facilities that support combustion research on the International Space Station. It gives readers a way to connect a research question to the experiment designed to address it.',
  },
  {
    imageAlt: 'Thumbnail from NASA’s ScienceCasts video on combustion aboard the ISS',
    id: 'sciencecasts', group: 'research', kind: 'NASA ScienceCasts · Video',
    title: 'The Power of Studying Combustion on the ISS',
    url: 'https://www.youtube.com/watch?v=W1oXykoz9zg',
    summary: 'A short NASA video introducing combustion experiments on the International Space Station.',
    takeaway: 'NASA’s 2018 introduction is a starting point for readers new to the subject. It puts the station’s combustion research in context before the more detailed experiment descriptions in the researcher’s guide.',
  },
  {
    imageAlt: 'Cover of NASA’s Combustion Science researcher’s guide',
    id: 'researchers-guide', group: 'research', kind: 'NASA researcher’s guide',
    title: 'A Researcher’s Guide to ISS Combustion Science',
    url: 'https://www.nasa.gov/missions/station/a-researchers-guide-to-combustion-science/',
    summary: 'A 2015 guide to combustion research carried out or planned aboard the International Space Station.',
    takeaway: 'Use the guide to understand the research goals, facilities, and experiment designs behind the measurements. It describes the program as it stood when the guide was published.',
  },
  {
    imageAlt: 'Apollo 1 astronauts Grissom, White, and Chaffee beside their spacecraft',
    id: 'apollo-1', group: 'history', kind: 'NASA accident case study',
    title: 'Apollo 1',
    url: 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-1',
    summary: 'NASA traces the 1967 cabin fire during a ground test and the investigation that followed.',
    takeaway: 'The case study examines how the test atmosphere, combustible materials, and hatch design affected the accident. NASA documents the changes it made to the spacecraft and test procedures afterward.',
  },
  {
    imageAlt: 'The damaged Apollo 13 service module photographed after separation',
    id: 'apollo-13', group: 'history', kind: 'NASA accident case study',
    title: 'Apollo 13',
    url: 'https://sma.nasa.gov/sma-disciplines/accllp/apollo-13',
    summary: 'An oxygen tank failed in flight, ending the planned lunar landing and forcing the crew to return to Earth.',
    takeaway: 'NASA follows the investigation from the tank failure to changes in hardware and verification. The case shows how a failure in one system can threaten other systems that depend on it.',
  },
  {
    imageAlt: 'Space station Mir photographed from the shuttle Atlantis',
    id: 'mir', group: 'history', kind: 'NASA history',
    title: 'Fire Aboard Space Station Mir',
    url: 'https://www.nasa.gov/history/25-years-ago-fire-aboard-space-station-mir/',
    summary: 'A fire in an oxygen generator filled Mir with smoke and blocked access to one of its two escape spacecraft.',
    takeaway: 'NASA’s account describes the 1997 incident and how the experience informed International Space Station design and operations. It connects equipment placement, evacuation routes, and cabin smoke to crew safety.',
  },
  {
    imageAlt: 'Archival photograph of a firefighter wearing a breathing apparatus',
    id: 'air-tanks', group: 'spinoffs', kind: 'NASA Spinoff · 1976',
    title: 'Fireman’s Air Tanks',
    url: 'https://spinoff.nasa.gov/node/9582',
    summary: 'NASA and Scott Aviation worked on a lighter breathing system for firefighters.',
    takeaway: 'The design reduced the weight firefighters carried and improved visibility through the face mask. The original article describes how aerospace materials helped address practical constraints on the ground.',
  },
  {
    imageAlt: 'The fire detector components shown in NASA’s original Spinoff article',
    id: 'fire-detector', group: 'spinoffs', kind: 'NASA Spinoff · 1978',
    title: 'Fire Detector',
    url: 'https://spinoff.nasa.gov/node/9407',
    summary: 'A detector used in space shuttle orbiters could distinguish combustion particles from dust.',
    takeaway: 'The NASA article describes how this distinction reduced susceptibility to false alarms. It also discusses using multiple sensors to monitor large industrial spaces such as mines.',
  },
  {
    imageAlt: 'Archival photograph from NASA’s Project FIRES coverage',
    id: 'fire-attire', group: 'spinoffs', kind: 'NASA Spinoff · 1982',
    title: 'New Technology for the Fire Attire',
    url: 'https://spinoff.nasa.gov/node/9918',
    summary: 'Project FIRES evaluated aerospace materials and design ideas for firefighter protective clothing.',
    takeaway: 'The project tested lightweight thermal protection in cooperation with municipal fire departments. NASA’s article describes the evaluation and its role in developing future protective clothing standards.',
  },
] as const
