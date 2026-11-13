import re

SOURCE_TYPES = (
    'Reports', 'Science Documents', 'Engineering Documents', 'Presentations',
    'Experimental table', 'Analyzed Data', 'Reference Data', 'Calibration',
    'Raw Data', 'Investigation Metadata Files', 'Other Sources',
)
BY_LABEL = {label.casefold(): label for label in SOURCE_TYPES}
BY_LABEL.update({
    'report': 'Reports', 'published report': 'Reports',
    'experiment table': 'Experimental table', 'metadata': 'Investigation Metadata Files',
})


def infer_source_type(path):
    for parent in path.parents:
        if parent.name.casefold() in BY_LABEL:
            return BY_LABEL[parent.name.casefold()]
    if re.fullmatch(r'(i_investigation|s_psi-[0-9]+)[.]txt', path.name, re.I):
        return 'Investigation Metadata Files'
    match = re.match(r'psi-[0-9]+_([^_]+)_', path.name, re.I)
    if match and match[1].casefold() in BY_LABEL:
        return BY_LABEL[match[1].casefold()]
    return 'Experimental table' if path.suffix.lower() == '.csv' else 'Other Sources'
