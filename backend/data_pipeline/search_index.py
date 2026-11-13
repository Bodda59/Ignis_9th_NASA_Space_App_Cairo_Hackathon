"""Publish full-text search documents and autocomplete terms."""
import json

from data_pipeline.facts import tokens


def refresh_search_index(conn, study, documents, source_hash):
    other = json.dumps(study['metadata'], ensure_ascii=False) + ' ' + ' '.join(doc['title'] for doc in documents)
    conn.execute('''INSERT INTO investigation_search
        (investigation_id,title,objective,description,other_text,search_vector,source_hash)
        VALUES(%s,%s,%s,%s,%s,
          setweight(to_tsvector('english',%s),'A') || setweight(to_tsvector('english',%s),'B') ||
          setweight(to_tsvector('english',%s),'C') || setweight(to_tsvector('english',%s),'D'),%s)
        ON CONFLICT(investigation_id) DO UPDATE SET title=excluded.title,objective=excluded.objective,
          description=excluded.description,other_text=excluded.other_text,search_vector=excluded.search_vector,
          source_hash=excluded.source_hash''',
                 (study['id'], study['name'], study['objective'], study['description'], other,
                  study['name'], study['objective'], study['description'], other, source_hash))
    conn.execute('DELETE FROM search_terms WHERE investigation_id=%s', (study['id'],))
    terms = {(study['name'].casefold(), 'title'), (study['id'].casefold(), 'id')}
    terms.update((term, 'word') for term in tokens(' '.join([study['name'], study['objective'], study['description'], other]))
                 if len(term) >= 3 and len(term) <= 80)
    with conn.cursor(name='catalog_terms') as passages:
        passages.execute('SELECT p.text FROM rag_passages p JOIN rag_documents d ON d.id=p.document_id WHERE d.investigation_id=%s', (study['id'],))
        for passage in passages:
            terms.update((term, 'word') for term in tokens(passage['text']) if 3 <= len(term) <= 80)
    with conn.cursor() as cursor:
        cursor.executemany('INSERT INTO search_terms(term,investigation_id,term_type) VALUES(%s,%s,%s) ON CONFLICT DO NOTHING',
                           [(term, study['id'], kind) for term, kind in sorted(terms)])
