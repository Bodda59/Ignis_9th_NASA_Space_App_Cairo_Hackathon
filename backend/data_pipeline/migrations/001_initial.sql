SET search_path TO public, extensions;
CREATE EXTENSION IF NOT EXISTS vector;
CREATE TABLE IF NOT EXISTS rag_investigations (
    id text PRIMARY KEY,
    name text NOT NULL
);
CREATE TABLE IF NOT EXISTS rag_documents (
    id text PRIMARY KEY,
    investigation_id text NOT NULL REFERENCES rag_investigations(id),
    title text NOT NULL,
    file_name text NOT NULL,
    source_url text,
    content_hash text NOT NULL,
    index_signature text NOT NULL,
    embedding_model text NOT NULL,
    updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE IF NOT EXISTS rag_passages (
    id text PRIMARY KEY,
    document_id text NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
    text text NOT NULL,
    location jsonb NOT NULL,
    row_data jsonb,
    embedding vector(384) NOT NULL
);
CREATE INDEX IF NOT EXISTS rag_passages_document_idx ON rag_passages(document_id);
CREATE INDEX IF NOT EXISTS rag_documents_investigation_idx ON rag_documents(investigation_id);

-- Backend-only RAG storage: browser roles use the authenticated FastAPI layer.
alter table public.rag_investigations enable row level security;
alter table public.rag_documents enable row level security;
alter table public.rag_passages enable row level security;
revoke all on public.rag_investigations,public.rag_documents,public.rag_passages from public,anon,authenticated;
grant all on public.rag_investigations,public.rag_documents,public.rag_passages to service_role;
