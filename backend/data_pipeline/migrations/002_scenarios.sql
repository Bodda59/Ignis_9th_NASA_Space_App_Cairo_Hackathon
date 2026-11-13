SET search_path TO public, extensions;
CREATE TABLE IF NOT EXISTS rag_scenario_fields (
    key text PRIMARY KEY,
    label text NOT NULL,
    kind text NOT NULL CHECK (kind IN ('number','category')),
    unit text,
    minimum double precision,
    maximum double precision,
    CHECK ((kind='number' AND unit IS NOT NULL) OR (kind='category' AND unit IS NULL))
);
CREATE TABLE IF NOT EXISTS rag_scenario_profiles (
    document_id text PRIMARY KEY REFERENCES rag_documents(id) ON DELETE CASCADE,
    profile jsonb NOT NULL,
    diagnostics jsonb NOT NULL,
    extractor_version text NOT NULL
);
CREATE TABLE IF NOT EXISTS rag_scenario_records (
    id text PRIMARY KEY,
    passage_id text NOT NULL UNIQUE REFERENCES rag_passages(id) ON DELETE CASCADE,
    external_id text NOT NULL,
    record_kind text NOT NULL CHECK (record_kind IN ('reported_test','source_record','planned_record'))
);
CREATE TABLE IF NOT EXISTS rag_scenario_values (
    record_id text NOT NULL REFERENCES rag_scenario_records(id) ON DELETE CASCADE,
    field_key text NOT NULL REFERENCES rag_scenario_fields(key),
    state text NOT NULL CHECK (state IN ('usable','missing','ambiguous','invalid')),
    low double precision,
    high double precision,
    category text,
    raw text NOT NULL,
    source_column text NOT NULL,
    mapping_note text NOT NULL,
    scale double precision NOT NULL,
    PRIMARY KEY (record_id,field_key),
    CHECK ((state='usable' AND ((low IS NOT NULL AND high IS NOT NULL AND category IS NULL
            AND low <= high AND low > '-Infinity'::float8 AND high < 'Infinity'::float8)
          OR (low IS NULL AND high IS NULL AND category IS NOT NULL)))
        OR (state<>'usable' AND low IS NULL AND high IS NULL AND category IS NULL))
);
CREATE INDEX IF NOT EXISTS rag_scenario_values_number_idx ON rag_scenario_values(field_key,low,high) WHERE state='usable';
CREATE INDEX IF NOT EXISTS rag_scenario_values_category_idx ON rag_scenario_values(field_key,category) WHERE state='usable';
CREATE INDEX IF NOT EXISTS rag_passages_text_idx ON rag_passages USING gin(to_tsvector('english', text));
-- Access is through the authenticated backend database connection, not Supabase's public table API.
ALTER TABLE rag_scenario_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_scenario_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_scenario_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE rag_scenario_values ENABLE ROW LEVEL SECURITY;
