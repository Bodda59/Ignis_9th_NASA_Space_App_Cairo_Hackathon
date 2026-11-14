"""Conservative, configurable extraction of conditions from source CSV rows."""
import math
import re

from pydantic import BaseModel, ConfigDict, Field, FiniteFloat, model_validator
from typing import Literal


EXTRACTOR_VERSION = 'csv-conditions-v1'


class ColumnMapping(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    key: str = Field(pattern=r'^[a-z][a-z0-9_]{0,63}$')
    label: str = Field(min_length=1, max_length=120)
    kind: Literal['number', 'category']
    unit: str | None = Field(default=None, min_length=1, max_length=30)
    source_unit_suffix: str | None = Field(default=None, min_length=1, max_length=30)
    excluded_values: list[str] = Field(default_factory=list, max_length=100)
    scale: FiniteFloat = Field(default=1, gt=0)
    minimum: FiniteFloat | None = None
    maximum: FiniteFloat | None = None
    note: str = Field(default='', max_length=1000)

    @model_validator(mode='after')
    def valid_kind(self):
        if (self.kind == 'number') != (self.unit is not None):
            raise ValueError('Numeric mappings require a unit; categorical mappings have no unit.')
        if self.source_unit_suffix is not None and self.kind != 'number':
            raise ValueError('Only numeric mappings can declare a source unit suffix.')
        if self.minimum is not None and self.maximum is not None and self.minimum > self.maximum:
            raise ValueError('Invalid mapping bounds.')
        return self


class ConditionProfile(BaseModel):
    model_config = ConfigDict(extra='forbid')
    columns: dict[str, ColumnMapping | None] = Field(default_factory=dict, max_length=100)
    id_column: str | None = Field(default=None, max_length=200)
    record_kind: Literal['reported_test', 'source_record', 'planned_record'] | None = None
    source_record_values: dict[str, list[str]] = Field(default_factory=dict, max_length=100)


def header_key(text):
    return re.sub(r'[^a-z0-9]+', ' ', text.casefold().replace('₂', '2').replace('%', ' percent ')).strip()


def number(key, label, unit, scale=1, maximum=None):
    return ColumnMapping(key=key, label=label, kind='number', unit=unit, scale=scale,
                         minimum=0, maximum=maximum)


def category(key, label):
    return ColumnMapping(key=key, label=label, kind='category')


ALIASES = {}


def aliases(mapping, *headers):
    for header in headers:
        ALIASES[header_key(header)] = mapping


aliases(category('material', 'Reported material'), 'Material', 'Fuel Sample Material', 'Sample Material')
aliases(category('fuel', 'Reported fuel'), 'Fuel')
aliases(category('gravity', 'Reported gravity environment'), 'Gravity', 'Gravity environment', 'Gravity regime')
aliases(category('flow_direction', 'Flow direction'), 'Flow Direction')
aliases(category('geometry', 'Sample geometry'), 'Geometry', 'Sample geometry')
aliases(number('initial_oxygen_percent', 'Initial oxygen concentration', '%', maximum=100),
        'Calibrated initial O2 % by vol', 'Initial O2 %', 'Initial oxygen (%)')
aliases(number('oxygen_percent', 'Reported oxygen concentration', '%', maximum=100),
        'Percent O2', 'Oxygen (%)', 'O2 (%)')
aliases(number('initial_oxygen_percent', 'Initial oxygen concentration', '%', scale=100, maximum=100),
        'Initial O2 mole fraction', 'O2 initial ambient composition; mole fraction')
aliases(number('airflow_cm_s', 'Reported air flow speed', 'cm/s'),
        'Air Flow (cm/s)', 'Airflow (cm/s)', 'Air flow speed (cm/s)')
aliases(number('airflow_cm_s', 'Reported air flow speed', 'cm/s', scale=100), 'Air Flow (m/s)')
aliases(number('aging_duration_minutes', 'Aging duration', 'min'), 'Aging Duration (minutes)')
aliases(number('ignition_power_w', 'Ignition power', 'W'), 'Ignition Power (W)')
aliases(number('ignition_time_s', 'Ignition time', 's'), 'Ignition Time (s)')
aliases(number('droplet_initial_diameter_mm', 'Initial droplet diameter', 'mm'), 'Droplet initial diameter; mm')
for label, factor in [('kPa', 1), ('Pa', .001), ('mmHg', 0.13332236842105263), ('psi', 6.894757293), ('bar', 100), ('atm', 101.325)]:
    aliases(number('pressure_kpa', 'Ambient pressure', 'kPa', scale=factor),
            f'Ambient pressure; {label}', f'Pressure ({label})', f'Ambient pressure ({label})')
for dimension in ['thickness', 'length', 'width']:
    for unit, scale in [('mm', 1), ('cm', 10), ('m', 1000)]:
        aliases(number(f'sample_{dimension}_mm', f'Sample {dimension}', 'mm', scale=scale),
                f'Sample {dimension} ({unit})')


NUM = r'[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?'
RANGE = re.compile(rf'^({NUM})\s*(?:-|–|—|to)\s*({NUM})$', re.I)
MISSING = {'', 'none', 'n/a', 'na', 'null', '-', 'not reported', 'unknown'}


def parse_value(raw, mapping):
    text = str(raw).strip()
    value = {'field': {k: v for k, v in mapping.model_dump().items() if k in
                      {'key', 'label', 'kind', 'unit', 'minimum', 'maximum'}},
             'raw': str(raw), 'low': None, 'high': None, 'category': None,
             'state': 'usable', 'note': mapping.note, 'scale': mapping.scale}
    if text.casefold() in MISSING:
        value['state'] = 'missing'
    elif text.casefold() in {v.casefold().strip() for v in mapping.excluded_values}:
        value['state'] = 'ambiguous'
    elif mapping.kind == 'category':
        normalized = ' '.join(text.casefold().split())
        if mapping.key == 'material':
            materials = re.findall(r'\b(pmma|sibal|nomex|ultem|teflon)\b', normalized)
            if len(set(materials)) > 1:
                value['state'] = 'ambiguous'
            else:
                value['category'] = materials[0] if materials else normalized
        else:
            value['category'] = normalized
    else:
        suffix = mapping.source_unit_suffix
        if suffix and text.casefold().endswith(suffix.casefold()):
            text = text[:-len(suffix)].rstrip()
        if re.fullmatch(NUM, text):
            bounds = [float(text)] * 2
        elif match := RANGE.fullmatch(text):
            bounds = [float(x) for x in match.groups()]
        else:
            bounds = None
        if bounds is None:
            value['state'] = 'ambiguous'
        else:
            low, high = [x * mapping.scale for x in bounds]
            if (not all(math.isfinite(x) for x in [low, high]) or low > high
                    or (mapping.minimum is not None and low < mapping.minimum)
                    or (mapping.maximum is not None and high > mapping.maximum)):
                value['state'] = 'invalid'
            else:
                value.update(low=low, high=high)
    return value


def extract_records(units, profile=None):
    profile = ConditionProfile.model_validate(profile or {})
    custom = {header_key(k): v for k, v in profile.columns.items()}
    if len(custom) != len(profile.columns):
        raise ValueError('Profile column names must be distinct after header normalization.')
    records, unknown, mapped = [], set(), {}
    for index, unit in enumerate(units):
        if unit.row_data is None:
            continue
        values, used = [], set()
        for column, raw in unit.row_data.items():
            key = header_key(column)
            mapping = custom[key] if key in custom else ALIASES.get(key)
            if mapping is None:
                if key not in custom:
                    unknown.add(column)
                continue
            if mapping.key in used:
                raise ValueError(f'Multiple columns map to {mapping.key}; use a condition profile to resolve them.')
            used.add(mapping.key)
            value = parse_value(raw, mapping)
            value['column'] = column
            values.append(value)
            mapped[column] = mapping.model_dump()
        if not values:
            continue
        id_column = profile.id_column
        if id_column and id_column not in unit.row_data:
            raise ValueError(f'Configured ID column {id_column} does not exist.')
        if not id_column:
            id_column = next((k for k in unit.row_data if header_key(k) in
                              {'test', 'test no', 'test number', 'flex test'}), None)
        external_id = str(unit.row_data[id_column]).strip() if id_column else f'CSV record {unit.location.get("csv_record", index+1)}'
        kind = profile.record_kind or ('reported_test' if id_column else 'source_record')
        if any(str(unit.row_data.get(column, '')).strip().casefold() in {value.strip().casefold() for value in values}
               for column, values in profile.source_record_values.items()):
            kind = 'source_record'
        records.append({'passage_index': index, 'external_id': external_id or f'CSV record {index+1}',
                        'kind': kind,
                        'values': values})
    return records, {'version': EXTRACTOR_VERSION, 'unmapped_columns': sorted(unknown),
                     'mappings': mapped, 'records': len(records)}
