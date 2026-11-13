SET search_path TO public, extensions;
CREATE EXTENSION IF NOT EXISTS pg_trgm;
ALTER TABLE rag_investigations ADD COLUMN IF NOT EXISTS description text NOT NULL DEFAULT '';
ALTER TABLE rag_investigations ADD COLUMN IF NOT EXISTS objective text NOT NULL DEFAULT '';
ALTER TABLE rag_investigations ADD COLUMN IF NOT EXISTS metadata jsonb NOT NULL DEFAULT '{}';
ALTER TABLE rag_investigations ADD COLUMN IF NOT EXISTS field_sources jsonb NOT NULL DEFAULT '{}';
ALTER TABLE rag_investigations ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE rag_investigations ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
ALTER TABLE rag_investigations ADD COLUMN IF NOT EXISTS content_hash text;
ALTER TABLE rag_investigations ADD COLUMN IF NOT EXISTS published_content_hash text;
ALTER TABLE rag_documents ADD COLUMN IF NOT EXISTS catalog_profile jsonb NOT NULL DEFAULT '{}';

CREATE TABLE IF NOT EXISTS audience_profiles (
 id text PRIMARY KEY CHECK(id IN ('undergraduate','graduate','professor','researcher','engineer')),
 version text NOT NULL, config jsonb NOT NULL, updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS investigation_tests (
 id text PRIMARY KEY, investigation_id text NOT NULL REFERENCES rag_investigations(id) ON DELETE CASCADE,
 document_id text NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
 external_id text NOT NULL, record_kind text NOT NULL CHECK(record_kind IN ('reported_test','source_record','planned_record')),
 parameters jsonb NOT NULL, source jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS catalog_tests_study ON investigation_tests(investigation_id);
CREATE TABLE IF NOT EXISTS investigation_samples (
 id text PRIMARY KEY, investigation_id text NOT NULL REFERENCES rag_investigations(id) ON DELETE CASCADE,
 document_id text NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
 external_id text, material text, geometry text, properties jsonb NOT NULL, source jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS catalog_samples_study ON investigation_samples(investigation_id);
CREATE INDEX IF NOT EXISTS catalog_samples_properties ON investigation_samples USING gin(properties);
CREATE TABLE IF NOT EXISTS test_samples (
 test_id text NOT NULL REFERENCES investigation_tests(id) ON DELETE CASCADE,
 sample_id text NOT NULL REFERENCES investigation_samples(id) ON DELETE CASCADE, PRIMARY KEY(test_id,sample_id)
);
CREATE TABLE IF NOT EXISTS measurement_types (
 key text PRIMARY KEY, name text NOT NULL, quantity text NOT NULL, unit text, kind text NOT NULL
 CHECK(kind IN ('number','category'))
);
CREATE TABLE IF NOT EXISTS investigation_measurements (
 id text PRIMARY KEY, investigation_id text NOT NULL REFERENCES rag_investigations(id) ON DELETE CASCADE,
 test_id text REFERENCES investigation_tests(id) ON DELETE CASCADE,
 measurement_key text NOT NULL REFERENCES measurement_types(key),
 value jsonb, original_unit text, source jsonb NOT NULL
);
CREATE INDEX IF NOT EXISTS catalog_measurements_study ON investigation_measurements(investigation_id);
CREATE TABLE IF NOT EXISTS experiment_tables (
 id text PRIMARY KEY, investigation_id text NOT NULL REFERENCES rag_investigations(id) ON DELETE CASCADE,
 document_id text NOT NULL UNIQUE REFERENCES rag_documents(id) ON DELETE CASCADE,
 title text NOT NULL, revision text NOT NULL, row_count integer NOT NULL CHECK(row_count>=0), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_tables_study ON experiment_tables(investigation_id);
CREATE TABLE IF NOT EXISTS experiment_table_columns (
 table_id text NOT NULL REFERENCES experiment_tables(id) ON DELETE CASCADE,
 key text NOT NULL, header text NOT NULL, position integer NOT NULL, kind text NOT NULL,
 unit text, mapping jsonb NOT NULL DEFAULT '{}', PRIMARY KEY(table_id,key), UNIQUE(table_id,position)
);
CREATE TABLE IF NOT EXISTS experiment_table_rows (
 table_id text NOT NULL REFERENCES experiment_tables(id) ON DELETE CASCADE,
 row_number integer NOT NULL, test_id text REFERENCES investigation_tests(id) ON DELETE SET NULL,
 cells jsonb NOT NULL, normalized jsonb NOT NULL, source jsonb NOT NULL, PRIMARY KEY(table_id,row_number)
);
CREATE TABLE IF NOT EXISTS investigation_summaries (
 investigation_id text NOT NULL REFERENCES rag_investigations(id) ON DELETE CASCADE,
 audience_type text NOT NULL REFERENCES audience_profiles(id), source_hash text NOT NULL,
 extractor_version text NOT NULL, profile_version text NOT NULL, facts jsonb NOT NULL,
 narrative jsonb, narrative_status text NOT NULL DEFAULT 'disabled',
 model_version text, generated_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY(investigation_id,audience_type)
);
CREATE TABLE IF NOT EXISTS investigation_search (
 investigation_id text PRIMARY KEY REFERENCES rag_investigations(id) ON DELETE CASCADE,
 title text NOT NULL, objective text NOT NULL, description text NOT NULL, other_text text NOT NULL,
 search_vector tsvector NOT NULL, source_hash text NOT NULL
);
CREATE INDEX IF NOT EXISTS catalog_search_fts ON investigation_search USING gin(search_vector);
CREATE INDEX IF NOT EXISTS catalog_search_title_trgm ON investigation_search USING gin(title gin_trgm_ops);
CREATE INDEX IF NOT EXISTS catalog_search_objective_trgm ON investigation_search USING gin(objective gin_trgm_ops);
CREATE INDEX IF NOT EXISTS catalog_search_description_trgm ON investigation_search USING gin(description gin_trgm_ops);
CREATE TABLE IF NOT EXISTS search_terms (
 term text NOT NULL, investigation_id text NOT NULL REFERENCES rag_investigations(id) ON DELETE CASCADE,
 term_type text NOT NULL, PRIMARY KEY(term,investigation_id,term_type)
);
CREATE INDEX IF NOT EXISTS catalog_terms_trgm ON search_terms USING gin(term gin_trgm_ops);
CREATE INDEX IF NOT EXISTS catalog_terms_prefix ON search_terms(term text_pattern_ops);
CREATE TABLE IF NOT EXISTS search_suggestion_cache (
 key text PRIMARY KEY, result jsonb NOT NULL, expires_at timestamptz NOT NULL
);
CREATE TABLE IF NOT EXISTS comparison_cache (
 key text PRIMARY KEY, investigation_ids text[] NOT NULL CHECK(cardinality(investigation_ids) BETWEEN 2 AND 10),
 audience_type text NOT NULL REFERENCES audience_profiles(id), source_hashes jsonb NOT NULL,
 result jsonb NOT NULL, narrative jsonb, narrative_status text NOT NULL DEFAULT 'disabled',
 version text NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS background_jobs (
 id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, kind text NOT NULL, target text NOT NULL,
 source_hash text NOT NULL, payload jsonb NOT NULL DEFAULT '{}', deduplication_key text NOT NULL UNIQUE,
 status text NOT NULL DEFAULT 'pending' CHECK(status IN ('pending','running','complete','failed','superseded')),
 attempts integer NOT NULL DEFAULT 0, run_after timestamptz NOT NULL DEFAULT now(),
 lease_until timestamptz, lease_token text, error_code text,
 created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_jobs_runnable ON background_jobs(run_after,id) WHERE status IN ('pending','running');
CREATE TABLE IF NOT EXISTS api_keys (
 key_hash text PRIMARY KEY, label text NOT NULL, scopes text[] NOT NULL,
 revoked_at timestamptz, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS catalog_study_updated ON rag_investigations(updated_at,id);
CREATE INDEX IF NOT EXISTS catalog_study_name ON rag_investigations(name,id);
CREATE INDEX IF NOT EXISTS catalog_study_metadata ON rag_investigations USING gin(metadata);

CREATE OR REPLACE FUNCTION catalog_source_hash(study text) RETURNS text LANGUAGE sql STABLE AS $$
 SELECT encode(sha256(convert_to(jsonb_build_object(
  'name',i.name,'description',i.description,'objective',i.objective,'metadata',i.metadata,'sources',i.field_sources,
  'documents',coalesce((SELECT jsonb_agg(jsonb_build_array(d.id,d.content_hash,d.index_signature,d.catalog_profile,
      sp.profile,sp.extractor_version) ORDER BY d.id)
    FROM rag_documents d LEFT JOIN rag_scenario_profiles sp ON sp.document_id=d.id
    WHERE d.investigation_id=i.id),'[]'::jsonb)
 )::text,'UTF8')),'hex') FROM rag_investigations i WHERE i.id=study
$$;
CREATE OR REPLACE FUNCTION catalog_enqueue(study text) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE hash text; job_id bigint;
BEGIN
 hash:=catalog_source_hash(study);
 IF hash IS NULL THEN RETURN NULL; END IF;
 UPDATE rag_investigations SET content_hash=hash,updated_at=now() WHERE id=study AND content_hash IS DISTINCT FROM hash;
 INSERT INTO background_jobs(kind,target,source_hash,deduplication_key)
 VALUES('catalog',study,hash,'catalog:'||study||':'||hash)
 ON CONFLICT(deduplication_key) DO UPDATE SET
  status=CASE WHEN background_jobs.status='failed' THEN 'pending' ELSE background_jobs.status END,
  attempts=CASE WHEN background_jobs.status='failed' THEN 0 ELSE background_jobs.attempts END
 RETURNING id INTO job_id;
 RETURN job_id;
END $$;
CREATE OR REPLACE FUNCTION catalog_document_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF TG_OP='DELETE' THEN PERFORM catalog_enqueue(OLD.investigation_id); RETURN OLD; END IF;
 PERFORM catalog_enqueue(NEW.investigation_id); RETURN NEW;
END $$;
CREATE OR REPLACE FUNCTION catalog_investigation_changed() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN PERFORM catalog_enqueue(NEW.id); RETURN NEW; END $$;
CREATE OR REPLACE FUNCTION catalog_profile_changed() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE study text;
BEGIN
 SELECT investigation_id INTO study FROM rag_documents WHERE id=coalesce(NEW.document_id,OLD.document_id);
 IF study IS NOT NULL THEN PERFORM catalog_enqueue(study); END IF;
 RETURN NULL;
END $$;
DROP TRIGGER IF EXISTS catalog_document_update ON rag_documents;
CREATE TRIGGER catalog_document_update AFTER INSERT OR DELETE OR UPDATE OF content_hash,index_signature,catalog_profile
 ON rag_documents FOR EACH ROW EXECUTE FUNCTION catalog_document_changed();
DROP TRIGGER IF EXISTS catalog_investigation_update ON rag_investigations;
CREATE TRIGGER catalog_investigation_update AFTER INSERT OR UPDATE OF name,description,objective,metadata,field_sources
 ON rag_investigations FOR EACH ROW EXECUTE FUNCTION catalog_investigation_changed();
DROP TRIGGER IF EXISTS catalog_mapping_update ON rag_scenario_profiles;
CREATE TRIGGER catalog_mapping_update AFTER INSERT OR UPDATE OR DELETE ON rag_scenario_profiles
 FOR EACH ROW EXECUTE FUNCTION catalog_profile_changed();

DO $$
DECLARE tab text;
BEGIN
 FOREACH tab IN ARRAY ARRAY['audience_profiles','investigation_tests','investigation_samples','test_samples',
 'measurement_types','investigation_measurements','experiment_tables','experiment_table_columns','experiment_table_rows',
 'investigation_summaries','investigation_search','search_terms','search_suggestion_cache','comparison_cache',
 'background_jobs','api_keys'] LOOP EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY',tab); END LOOP;
END $$;

-- Pin catalog function resolution without changing behavior.
alter function public.catalog_source_hash(text) set search_path=public,extensions,pg_temp;
alter function public.catalog_enqueue(text) set search_path=public,extensions,pg_temp;
alter function public.catalog_document_changed() set search_path=public,extensions,pg_temp;
alter function public.catalog_investigation_changed() set search_path=public,extensions,pg_temp;
alter function public.catalog_profile_changed() set search_path=public,extensions,pg_temp;
