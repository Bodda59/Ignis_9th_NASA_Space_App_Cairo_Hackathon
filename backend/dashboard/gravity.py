"""Partial-gravity evidence: what PSI can say between orbit (0 g) and Earth (1 g).

PSI holds no partial-gravity combustion data. This module gathers what can stand
in for it: studies whose PSI record compares microgravity with Earth gravity,
E-FIELD's simulated effect, and NASA partial-gravity tests published outside
PSI. Every PSI quote is copied from the transferred metadata, and a test checks
each one against the source text.
"""
import re

from dashboard.earth import records
from data_pipeline.reviewed import REVIEWED

BRIEF = {'title': 'NASA Space Apps 2026 challenge brief: Partial-gravity data',
         'url': 'https://www.spaceappschallenge.org/2026/challenges/flame-in-freefall/?tab=details'}
OLSON_2012 = {'title': 'Evaluating Material Flammability in Microgravity and Martian Gravity Compared to the NASA Standard Normal Gravity Test (Olson & Ferkul, 2012)',
              'url': 'https://ntrs.nasa.gov/citations/20130010991'}
LUCI_2025 = {'title': 'Lunar Combustion Investigation: Flammability Results from a Rotating Sounding Rocket (Ferkul et al., 2025)',
             'url': 'https://ntrs.nasa.gov/citations/20250010653'}

TOPICS = {
    'material_flammability': 'Material flammability',
    'smoke': 'Smoke and detection',
    'flame_structure': 'Flame structure and soot',
}

# Studies whose PSI record sets microgravity against Earth gravity.
# `summary` is this project's one-line reading; `quote` is copied from the named field.
BRACKETS = [
    {'id': 'PSI-26', 'topic': 'material_flammability', 'field': 'hypothesis',
     'summary': 'Microgravity may be the harsher case for a ventilated material.',
     'quote': 'materials in microgravity, with adequate ventilation, burn as well if not better than the same material in normal gravity with other conditions being identical'},
    {'id': 'PSI-25', 'topic': 'material_flammability', 'field': 'hypothesis',
     'summary': 'The Earth upward-burning screening test may not be the worst case in space.',
     'quote': 'NASA tests and controls materials from a flammability perspective using an upward burning test in normal gravity, which is considered to be the worst-case geometry for flammability of the material on Earth. However, it may not be conservative for flammability in space.'},
    {'id': 'PSI-98', 'topic': 'material_flammability', 'field': 'objective',
     'summary': 'Large-scale low-gravity fire growth, checked against the Earth screening test.',
     'quote': 'investigate the low-g flammability limits compared to those obtained in NASA’s normal gravity material flammability screening test.'},
    {'id': 'PSI-99', 'topic': 'material_flammability', 'field': 'objective',
     'summary': 'Large-scale low-gravity fire growth, checked against the Earth screening test.',
     'quote': 'investigate the low-g flammability limits compared to those obtained in NASA’s normal gravity material flammability screening test.'},
    {'id': 'PSI-100', 'topic': 'material_flammability', 'field': 'objective',
     'summary': 'Large-scale low-gravity fire growth, checked against the Earth screening test.',
     'quote': 'investigate the low-g flammability limits compared to those obtained in NASA’s normal gravity material flammability screening test.'},
    {'id': 'PSI-20', 'topic': 'material_flammability', 'field': 'approach',
     'summary': 'Ignition limits come from Earth tests and are expected to carry over to microgravity.',
     'quote': 'Ignition limit tests are not proposed for microgravity, but we will explore these under normal gravity.'},
    {'id': 'PSI-102', 'topic': 'smoke', 'field': 'hypothesis',
     'summary': 'Smoke particles are expected to grow larger without buoyancy.',
     'quote': 'liquid aerosol smokes produced in microgravity will exhibit substantially larger droplet sizes than under the same conditions in normal gravity'},
    {'id': 'PSI-101', 'topic': 'smoke', 'field': 'hypothesis',
     'summary': 'Smoke particles are expected to grow larger without buoyancy.',
     'quote': 'liquid aerosol smokes produced in microgravity will exhibit substantially larger droplet sizes than under the same conditions in normal gravity'},
    {'id': 'PSI-107', 'topic': 'flame_structure', 'field': 'hypothesis',
     'summary': 'Flame properties are expected to change when gravity-driven flow is removed.',
     'quote': 'Flame properties are expected to differ significantly from those observed under normal gravity.'},
]
EARTH_COMPARISON_IDS = frozenset(item['id'] for item in BRACKETS)

# Reviewed findings that compare low gravity with Earth (data_pipeline/reviewed.py).
COMPARISON_FINDINGS = {'PSI-98', 'PSI-101'}

SIMULATED = {
    'id': 'PSI-22',
    'brief_quote': 'Partial gravity was mimicked in ACME’s Electric-Field Effects on Laminar Diffusion Flames (E-FIELD Flames) experiment through the effect of the electric field on the ions that naturally occur in flames.',
    'record_quotes': [
        {'field': 'approach', 'quote': 'This unique environment is ideal for isolating electric field effects from buoyancy forces.'},
        {'field': 'approach', 'quote': 'The gas-jet burner is used to create a small, focused flame for detailed ion-driven convection studies'},
    ],
    'limit': 'An electric field pushes on the ions in a flame. It reproduces some effects of buoyancy, not partial gravity itself, and its record gives no equivalent gravity level.',
}

# NASA partial-gravity work outside PSI, as described on each NASA Technical Reports Server page.
OUTSIDE = [
    {'id': 'luci', 'name': 'LUCI · Lunar Combustion Investigation', 'short': 'LUCI', 'g': 0.166, 'status': 'flown',
     'method': 'Spinning New Shepard sounding rocket',
     'text': 'A spinning sounding rocket produced lunar-level acceleration for over two and a half minutes. A cotton-fiberglass fabric sheet and an acrylic (PMMA) rod burned in air at normal pressure; the results are compared with 1 g, drop-tower, aircraft and modeling work.',
     'source': LUCI_2025},
    {'id': 'fm2', 'name': 'FM2 · Flammability of Materials on the Moon', 'short': 'FM2 · planned', 'g': 0.166, 'status': 'planned',
     'method': 'Burn tests on the lunar surface',
     'text': 'Burn tests on the Moon itself. The LUCI report describes FM2 as the next step, planned to launch in late 2026.',
     'source': LUCI_2025},
    {'id': 'mars_drop', 'name': 'Martian-gravity drop-tower tests', 'short': 'Mars drop tower', 'g': 0.38, 'status': 'published',
     'method': 'Drop tower',
     'text': 'Three materials burned at Martian gravity and were compared with Earth and other low-gravity tests, to judge the safety margin of Earth-gravity screening.',
     'source': OLSON_2012},
]

BOUNDING = {
    'brief_quote': 'Microgravity and normal-gravity results could bound what occurs at intermediate gravity levels.',
    'caveat_study': 'PSI-25',
    'caveat_quote': 'However, it may not be conservative for flammability in space.',
    'nasa_summary': ('Earlier microgravity and lunar-gravity tests found some materials burned at lower oxygen levels in low gravity than on Earth. '
                     'The Martian-gravity results suggest a gravity level below Earth’s at which materials burn more readily than on Earth. '
                     'The authors note that, if this holds for more materials, Earth-gravity flammability limits may need a factor of safety.'),
    'nasa_source': OLSON_2012,
    'takeaway': ('Treat orbit and Earth results as reference points, not as a guaranteed envelope. '
                 'The worst case may sit between them, so Earth-gravity screening alone may not cover the Moon or Mars.'),
}

LIMITS = [
    'PSI holds no partial-gravity combustion data yet.',
    'The indexed test tables record no gravity level for individual tests; gravity is known per study.',
    'Simulated gravity (spinning rockets, drop towers, electric fields) only approximates real partial gravity.',
    'This page describes research evidence. It does not certify any material or habitat atmosphere.',
]


def squash(text):
    return re.sub(r'\s+', ' ', text or '').strip()


def study_ref(sid):
    record = records()[sid]
    return {'id': sid, 'acronym': record.get('acronym') or sid, 'name': record['name'], 'psi_url': record.get('source_url')}


def finding(sid):
    reviewed = REVIEWED.get(sid) if sid in COMPARISON_FINDINGS else None
    if not reviewed:
        return None
    source = reviewed['source_refs'][0]
    return {'text': reviewed['text'], 'source_title': source['title'], 'source_url': source.get('source_url')}


def gravity_catalogue():
    brackets = [dict(study_ref(item['id']), topic=item['topic'], topic_label=TOPICS[item['topic']],
                     summary=item['summary'], field=item['field'], quote=item['quote'], finding=finding(item['id']))
                for item in BRACKETS]
    microgravity = sum(record.get('project_type') == 'Microgravity Investigation' for record in records().values())
    return {
        'counts': {'microgravity_studies': microgravity, 'earth_comparison_studies': len(brackets),
                   'partial_gravity_studies': 0, 'outside_psi': len(OUTSIDE)},
        'topics': [{'id': key, 'label': label} for key, label in TOPICS.items()],
        'brackets': brackets,
        'simulated': dict(study_ref(SIMULATED['id']), brief_quote=SIMULATED['brief_quote'], brief_source=BRIEF,
                          record_quotes=SIMULATED['record_quotes'], limit=SIMULATED['limit']),
        'outside': OUTSIDE,
        'bounding': dict(BOUNDING, brief_source=BRIEF, caveat_study=study_ref(BOUNDING['caveat_study'])),
        'limits': LIMITS,
    }
