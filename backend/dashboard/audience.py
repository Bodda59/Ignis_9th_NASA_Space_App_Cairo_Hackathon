"""Audience preferences change explanation and navigation, never scientific eligibility."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


Audience = Literal['undergraduate', 'graduate', 'professor', 'researcher', 'engineer']
Depth = Literal['introductory', 'technical']


class AudiencePreferences(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    audience: Audience = Field(default='graduate', description='Presentation preference, not an authorization role.')
    explanation_depth: Depth | None = Field(default=None, description='Omit to use the audience default; either depth is available to every audience.')


FEATURES = ['general_questions', 'scenario_questions', 'investigation_ranking', 'source_evidence', 'condition_comparison', 'lecture_slides', 'study_notes']
PROFILES = {
    'undergraduate': {
        'label': 'Undergraduate student', 'default_depth': 'introductory',
        'focus': 'Build understanding through clear explanations, reported observations and source references.',
        'recommended_features': ['general_questions', 'source_evidence', 'study_notes'],
        'recommended_views': ['answer', 'evidence', 'details'],
        'preferred_condition_keys': ['material', 'fuel', 'initial_oxygen_percent', 'oxygen_percent', 'gravity'],
        'instruction': 'Write for an undergraduate learning combustion. Explain the central observation step by step. Define essential technical terms only where the evidence supports those definitions. Keep conditions and limitations visible; simplifying language must not simplify away uncertainty.'},
    'graduate': {
        'label': 'Graduate student', 'default_depth': 'technical',
        'focus': 'Inspect experimental methods, variables, measurements and limitations for further research.',
        'recommended_features': ['investigation_ranking', 'scenario_questions', 'source_evidence', 'study_notes'],
        'recommended_views': ['evidence', 'answer', 'details'],
        'preferred_condition_keys': ['fuel', 'material', 'initial_oxygen_percent', 'oxygen_percent', 'pressure_kpa', 'airflow_cm_s', 'airflow_display_cm_s'],
        'instruction': 'Write for a graduate student conducting research. Emphasize methods, controlled and varied variables, measurements, and reported uncertainty when relevant. Distinguish hypotheses from observations and explain limits on cross-experiment comparisons.'},
    'professor': {
        'label': 'Professor', 'default_depth': 'technical',
        'focus': 'Explain teachable concepts and evidence-based comparisons for lectures and discussion.',
        'recommended_features': ['general_questions', 'investigation_ranking', 'source_evidence', 'lecture_slides'],
        'recommended_views': ['answer', 'evidence', 'details'],
        'preferred_condition_keys': ['material', 'fuel', 'gravity', 'initial_oxygen_percent', 'oxygen_percent', 'airflow_cm_s', 'airflow_display_cm_s'],
        'instruction': 'Write for a professor preparing an explanation or comparison. Organize the scientific concepts clearly and connect them to the cited observations. Distinguish a teaching interpretation from an experimental result. Do not invent demonstrations, exercises or findings unless the question asks for teaching suggestions, and never treat suggestions as observed evidence.'},
    'researcher': {
        'label': 'Aerospace researcher', 'default_depth': 'technical',
        'focus': 'Examine methods, provenance, uncertainties and comparability across investigations.',
        'recommended_features': ['source_evidence', 'scenario_questions', 'condition_comparison'],
        'recommended_views': ['evidence', 'details', 'answer'],
        'preferred_condition_keys': ['fuel', 'material', 'gravity', 'pressure_kpa', 'initial_oxygen_percent', 'oxygen_percent', 'droplet_initial_diameter_mm', 'geometry'],
        'instruction': 'Write for an aerospace combustion or fire-safety researcher. Prioritize methodological detail, measurement definitions, source provenance and uncertainty. Identify confounding differences when reported. Describe a conflict only when comparable evidence establishes it; missing indexed evidence does not prove that no research exists.'},
    'engineer': {
        'label': 'Aerospace engineer', 'default_depth': 'technical',
        'focus': 'Review applicability to stated design conditions and identify missing supporting evidence.',
        'recommended_features': ['scenario_questions', 'condition_comparison', 'source_evidence'],
        'recommended_views': ['evidence', 'answer', 'details'],
        'preferred_condition_keys': ['pressure_kpa', 'initial_oxygen_percent', 'oxygen_percent', 'gravity', 'material', 'fuel', 'airflow_cm_s', 'airflow_display_cm_s', 'geometry'],
        'instruction': 'Write for an aerospace engineer reviewing evidence for a design. Emphasize reported operating conditions, material and geometry differences, measurement limits and evidence applicability. Explicitly identify relevant missing conditions. Research results and numerical matches do not establish material qualification, certification, a safe operating envelope, or approval of a design.'},
}


def audience_context(preferences, fields=None):
    profile = PROFILES[preferences.audience]
    context = {'audience': preferences.audience, 'label': profile['label'],
               'explanation_depth': preferences.explanation_depth or profile['default_depth'],
               'focus': profile['focus'], 'recommended_features': list(profile['recommended_features']),
               'recommended_views': list(profile['recommended_views'])}
    if fields is not None:
        available = {f['key'] for f in fields if f['usable_records']}
        context['suggested_condition_keys'] = [key for key in profile['preferred_condition_keys'] if key in available][:3]
    return context


def audience_catalogue():
    return {'default_audience': 'graduate', 'explanation_depths': ['introductory', 'technical'],
            'available_features': list(FEATURES),
            'audiences': [dict(id=key, **{name: value for name, value in profile.items() if name != 'instruction'})
                          for key, profile in PROFILES.items()],
            'note': 'Recommendations personalize presentation. All five audiences retain the same evidence access, condition checks and answer-validation requirements.'}


def prioritize_conditions(result, preferences):
    context = audience_context(preferences, result['fields'])
    preferred = context['suggested_condition_keys']
    result['fields'] = sorted([dict(f, recommended=f['key'] in preferred) for f in result['fields']],
                              key=lambda f: preferred.index(f['key']) if f['key'] in preferred else len(preferred))
    return dict(result, audience_context=context)
