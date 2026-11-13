from dashboard.audience import audience_context
from research.providers import get_embeddings
from rag.retreiver import hybrid_search, rank_investigations


NO_CONTEXT_MESSAGE = 'I do not know, there is no context support this question'


class RAGService:
    def __init__(self, store, embeddings_factory=get_embeddings,
                 model_name='BAAI/bge-small-en-v1.5', min_similarity=.5):
        self.store = store
        self.embeddings_factory = embeddings_factory
        self.model_name = model_name
        self.min_similarity = min_similarity

    def retrieve(self, query):
        corpus = self.store.corpus(query.investigation_ids, self.model_name)
        if not corpus:
            return [], 'no_data'
        embeddings = self.embeddings_factory()
        vector = embeddings.embed_query(query.question)
        semantic = self.store.semantic(vector, query.investigation_ids, self.model_name, 60)
        # shortcut: rebuilding BM25 per query avoids stale worker caches; move lexical search to the server above 10k passages.
        matches = hybrid_search(query.question, corpus, semantic, min_similarity=self.min_similarity)
        return matches, 'ok' if matches else 'insufficient_evidence'

    def rank(self, query):
        matches, status = self.retrieve(query)
        return {'status': status, 'message': NO_CONTEXT_MESSAGE if not matches else None,
                'investigations': rank_investigations(matches, query.limit),
                'audience_context': audience_context(query),
                'warnings': ['Scores measure textual relevance, not safety or validated numerical matching.']}
