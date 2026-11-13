from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from dashboard.audience import AudiencePreferences
from data_pipeline.source_types import SOURCE_TYPES

class Query(AudiencePreferences):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    question: str = Field(min_length=1, max_length=2000)
    investigation_ids: list[str] = Field(default_factory=list, max_length=20,
        description='One ID for an investigation page; omit or send [] to search all indexed investigations. No fallback outside a selected scope.')
    limit: int = Field(default=5, ge=1, le=20)
    source_types: list[str] = Field(default_factory=list, max_length=len(SOURCE_TYPES))

    @field_validator("source_types")
    @classmethod
    def valid_source_types(cls, values):
        if any(value not in SOURCE_TYPES for value in values):
            raise ValueError("Unknown source type.")
        return list(dict.fromkeys(values))

    @field_validator('investigation_ids')
    @classmethod
    def valid_ids(cls, values):
        if any(not x or len(x) > 100 or x != x.strip() for x in values):
            raise ValueError('Study IDs must be nonblank and at most 100 characters.')
        return list(dict.fromkeys(values))


class Evidence(BaseModel):
    id: str
    investigation_id: str
    investigation_name: str
    document_id: str
    title: str
    text: str
    location: dict
    source_url: str | None = None
    content_hash: str
    row_data: dict | None = None
    source_type: str | None = None


class Claim(BaseModel):
    model_config = ConfigDict(extra='forbid', str_strip_whitespace=True)
    text: str = Field(min_length=1, max_length=4000)
    citation_ids: list[str] = Field(min_length=1, max_length=20)


class Answer(BaseModel):
    model_config = ConfigDict(extra='forbid')
    status: Literal['answered', 'insufficient_evidence']
    findings: list[Claim] = Field(max_length=20)
    interpretations: list[Claim] = Field(max_length=20)
    limitations: list[str] = Field(max_length=20)


def validate_answer(payload, allowed_ids):
    answer = Answer.model_validate(payload)
    claims = answer.findings + answer.interpretations
    if any(c not in allowed_ids for claim in claims for c in claim.citation_ids):
        raise ValueError('Answer cites evidence that was not retrieved.')
    if answer.status == 'answered' and not claims:
        raise ValueError('An answered response needs cited claims.')
    if answer.status == 'insufficient_evidence' and (claims or not any(x.strip() for x in answer.limitations)):
        raise ValueError('Insufficient evidence needs a reason and no asserted findings.')
    return answer.model_dump()
