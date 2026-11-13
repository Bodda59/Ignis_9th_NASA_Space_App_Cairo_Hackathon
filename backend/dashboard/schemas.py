"""Request schemas for the versioned catalog API."""
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator


class MetadataUpdate(BaseModel):
    model_config = ConfigDict(extra='forbid')
    description: str = Field(default='', max_length=50000)
    objective: str = Field(default='', max_length=50000)
    metadata: dict = Field(default_factory=dict)
    field_sources: dict = Field(default_factory=dict)


class MeasurementMapping(BaseModel):
    model_config = ConfigDict(extra='forbid')
    key: str = Field(pattern=r'^[a-z][a-z0-9_]{0,63}$')
    label: str = Field(min_length=1, max_length=120)
    quantity: str = Field(min_length=1, max_length=100)
    kind: Literal['number', 'category']
    unit: str | None = None
    original_unit: str | None = None
    scale: float = Field(default=1, gt=0, allow_inf_nan=False)
    source: dict = Field(min_length=1)
    note: str = Field(min_length=1, max_length=1000)

    @model_validator(mode='after')
    def units(self):
        if (self.kind == 'number') != bool(self.unit):
            raise ValueError('Numeric measurements require a unit.')
        return self


class DocumentProfile(BaseModel):
    model_config = ConfigDict(extra='forbid')
    measurement_types: list[MeasurementMapping] = Field(default_factory=list, max_length=100)
    measurement_columns: dict[str, MeasurementMapping] = Field(default_factory=dict, max_length=100)


class CompareRequest(BaseModel):
    model_config = ConfigDict(extra='forbid')
    investigation_ids: list[str] = Field(min_length=2, max_length=10)

    @model_validator(mode='after')
    def ids(self):
        if len(set(self.investigation_ids)) != len(self.investigation_ids) or any(
                not value or len(value) > 100 or value != value.strip() for value in self.investigation_ids):
            raise ValueError('Provide distinct, nonblank investigation IDs.')
        return self
