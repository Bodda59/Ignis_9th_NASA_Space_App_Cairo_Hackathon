"""Earth applications: NASA's stated research impacts, grouped by reviewed themes.

The impact text is NASA's own, read from the transferred PSI metadata. The theme
tags are this project's reading of that text; every tag carries the exact
sentence it rests on so the reader can check it.
"""
import json
from functools import lru_cache
from pathlib import Path

SOURCE = Path(__file__).resolve().parents[1] / 'data_pipeline/sources/investigations.json'

# Fire-safety themes come first; cleaner combustion is an Earth benefit of another kind.
THEMES = {
    'confined_spaces': {
        'label': 'Fire safety in sealed places',
        'description': 'Mines, aircraft and submarines share a spacecraft’s problem: a small sealed volume with nowhere to go.',
        'fire_safety': True},
    'smoke_detection': {
        'label': 'Smoke detection',
        'description': 'Measuring how smoke particles behave helps detectors tell real smoke from dust.',
        'fire_safety': True},
    'suppression': {
        'label': 'Fire suppression',
        'description': 'Knowing what makes a flame go out guides the design of extinguishing systems.',
        'fire_safety': True},
    'fire_modeling': {
        'label': 'Models of fires on Earth',
        'description': 'Microgravity removes buoyancy, which gives computer models of burning a simpler case to be checked against.',
        'fire_safety': True},
    'test_methods': {
        'label': 'Material flammability tests',
        'description': 'Flight results are compared with the ground tests used to screen materials.',
        'fire_safety': True},
    'cleaner_combustion': {
        'label': 'Cleaner engines and power',
        'description': 'Better flame chemistry models support more efficient, lower-emission engines and burners.',
        'fire_safety': False},
}

# (theme, sentence copied from the study's research-impacts text)
TAGS = {
    'PSI-142': [('cleaner_combustion', 'cool flames and warm flames are relevant and important flame regimes for high-pressure near-limit combustion applications.')],
    'PSI-117': [('cleaner_combustion', 'Advances low-temperature combustion understanding relevant to engine knock, efficiency, and emissions')],
    'PSI-10': [('cleaner_combustion', 'This project has the potential for improving efficiency and reducing pollutant emissions in terrestrial combustors.')],
    'PSI-20': [('test_methods', 'they suggest that NASA may want to increase use of its alternative flammability Test 2')],
    'PSI-21': [('suppression', 'an understanding of those factors that affect flame extinction in diffusion flames is critical in the suppression of fires and in improving engine efficiency.'),
               ('cleaner_combustion', 'an understanding of those factors that affect flame extinction in diffusion flames is critical in the suppression of fires and in improving engine efficiency.')],
    'PSI-22': [('cleaner_combustion', 'The use of electric fields to control flames can reduce the production of harmful pollutants in practical terrestrial combustion.')],
    'PSI-23': [('cleaner_combustion', 'understanding the underlying dynamics and chemistry of diffusion flames is important in improving performance in terms of power, efficiency, pollutant emissions, and reliability.')],
    'PSI-25': [('fire_modeling', 'These models can then be used to more accurately study flames on Earth, such as in wildfires, building fires, energy recapture from waste recycling, and other combustion problems.')],
    'PSI-26': [('fire_modeling', 'These models have wide applicability to the general understanding of many terrestrial combustion problems'),
               ('test_methods', 'a performance-based material selection process')],
    'PSI-39': [('cleaner_combustion', 'Cool flames play a key role in the development and selection of new fuels and the design of advanced engines')],
    'PSI-47': [('smoke_detection', 'the successful adaptation of the TSI P-Trak for microgravity can inform the design of instruments for use in other challenging Earth environments, such as submarines or underwater laboratories where accurate detection of smoke can save lives.')],
    'PSI-62': [('fire_modeling', 'On Earth, these advancements could improve combustion modeling by deepening our understanding of coupled thermal, chemical, and flow processes')],
    'PSI-68': [('cleaner_combustion', 'Insights gained from these studies can lead to more efficient and cleaner combustion technologies which are crucial for reducing pollution and greenhouse gas emissions.')],
    'PSI-69': [('confined_spaces', 'On Earth, the insights gained from these experiments have the potential to advance fire safety in confined and reduced-gravity environments, such as submarines or high-altitude aircraft.'),
               ('suppression', 'can lead to the development of more efficient and less harmful fire suppression systems, reducing the risk of toxic byproducts during fire events.'),
               ('cleaner_combustion', 'can inform the design of advanced combustion engines, leading to improved fuel efficiency and reduced emissions in automotive and industrial applications.')],
    'PSI-98': [('confined_spaces', 'benefits fire safety and prevention efforts on Earth, including inside mines, airplanes, or submarines.')],
    'PSI-99': [('confined_spaces', 'benefits fire safety and prevention efforts on Earth, including inside mines, airplanes, or submarines.')],
    'PSI-100': [('confined_spaces', 'benefits fire safety and prevention efforts on Earth, including inside mines, airplanes, or submarines.')],
    'PSI-101': [('smoke_detection', 'The smoke detectors developed from the results of SAME can also be useful in other extreme environments on Earth, such as submarines or underwater laboratories.')],
    'PSI-102': [('smoke_detection', 'The smoke detectors developed from the results of SAME can also be useful in other extreme environments on Earth, such as submarines or underwater laboratories.')],
    'PSI-106': [('fire_modeling', 'Insights into flame stability and behavior to enhance fire safety.'),
                ('cleaner_combustion', 'Findings will inform the development of cleaner, more efficient engines and industrial burners.')],
    'PSI-107': [('cleaner_combustion', 'Could possibly provide insights to better fuel formulations and combustion processes.')],
    'PSI-159': [('cleaner_combustion', 'This should facilitate the development of more efficient internal combustion engines.')],
}

NOTES = {
    'PSI-47': 'The PSI record describes potential applications. The DAFT final report identifies no demonstrated Earth spin-off from this experiment.',
    'PSI-100': 'The PSI record for SAFFIRE-III carries the Saffire-I description. It is shown here as published.',
}

# NASA technology already in use on Earth, as listed in the challenge brief and its resources.
# These came from spacesuit, shuttle and station hardware, and are separate from the PSI studies.
SPINOFFS = [
    {'id': 'air_tanks', 'title': 'Firefighter air tanks', 'era': '1970s',
     'text': 'Spacesuit technology was adapted to improve firefighters’ air tanks and breathing gear.',
     'source_title': 'NASA Spinoff: Fireman’s Air Tanks', 'url': 'https://spinoff.nasa.gov/node/9582', 'related_theme': None},
    {'id': 'fire_detector', 'title': 'Smoke detector that ignores dust', 'era': '1970s',
     'text': 'A smoke detector developed for the shuttle tells smoke from dust, which means fewer nuisance alarms. It found industrial uses such as mining.',
     'source_title': 'NASA Spinoff: Fire Detector', 'url': 'https://spinoff.nasa.gov/node/9407', 'related_theme': 'smoke_detection'},
    {'id': 'fire_attire', 'title': 'Firefighter clothing', 'era': '1980s',
     'text': 'Spacesuit technology was applied to improve firefighters’ protective clothing.',
     'source_title': 'NASA Spinoff: New Technology for the Fire Attire', 'url': 'https://spinoff.nasa.gov/node/9918', 'related_theme': None},
    {'id': 'water_mist', 'title': 'Fine-water-mist extinguishers', 'era': 'ISS',
     'text': 'Extinguishers developed for the International Space Station have practical applications on Earth.',
     'source_title': 'NASA Space Apps 2026 challenge brief', 'url': None, 'related_theme': 'suppression'},
]

CAVEAT = ('These are the potential benefits NASA states in each PSI record. '
          'They describe where the research could help; they are not measured outcomes.')


@lru_cache(maxsize=1)
def records():
    """Source metadata by study ID. Read from the repository file, so it needs no database."""
    return {record['id']: record for record in json.loads(SOURCE.read_text(encoding='utf-8'))}


def citation(sid, source=None):
    record = records().get(sid) or source or {}
    doi = record.get('doi')
    return {'doi': doi, 'doi_url': f'https://doi.org/{doi}' if doi else None, 'psi_url': record.get('source_url')}


def themes_for(sid):
    return [{'id': theme, 'label': THEMES[theme]['label'], 'fire_safety': THEMES[theme]['fire_safety'], 'quote': quote}
            for theme, quote in TAGS.get(sid, [])]


def study_earth(sid, source=None):
    """NASA's impact text for one study, or None when the record has none."""
    record = records().get(sid) or source
    text = ((record or {}).get('research_impacts') or '').replace('\r\n', '\n').strip()
    if not text:
        return None
    return {'text': text, 'themes': themes_for(sid), 'note': NOTES.get(sid),
            'source_title': 'NASA PSI record: Research Impacts / Earth Benefits', 'source_url': record.get('source_url')}


def earth_catalogue():
    grouped = {theme: [] for theme in THEMES}
    for sid, record in records().items():
        for theme, quote in TAGS.get(sid, []):
            grouped[theme].append({'id': sid, 'acronym': record.get('acronym') or sid, 'name': record['name'],
                                   'quote': quote, 'source_url': record.get('source_url')})
    themes = [dict(id=theme, **details, studies=sorted(grouped[theme], key=lambda study: study['acronym']))
              for theme, details in THEMES.items()]
    return {'themes': themes, 'spinoffs': SPINOFFS, 'caveat': CAVEAT,
            'study_count': len({study['id'] for theme in themes for study in theme['studies']})}
