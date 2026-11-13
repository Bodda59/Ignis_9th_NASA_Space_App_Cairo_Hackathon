"""Translate provider and RAG failures into HTTP responses."""
import httpx
import psycopg
from fastapi import HTTPException

def execute(engine, operation, query):
    try:
        return operation(query) if callable(operation) else getattr(engine(), operation)(query)
    except ValueError as error:
        # These errors are our own configuration/validation messages, not database/provider payloads.
        message = str(error)
        safe = ('selected investigation IDs', 'Question exceeds', 'Scope this query', 'different embedding model')
        if any(text in message for text in safe):
            raise HTTPException(400, message) from None
        raise HTTPException(503, 'RAG configuration is incomplete or the response could not be processed.') from None
    except httpx.TimeoutException:
        raise HTTPException(504, 'The model request timed out.') from None
    except (psycopg.Error, httpx.HTTPError):
        raise HTTPException(503, 'The database or model service is unavailable.') from None
    except Exception:
        raise HTTPException(503, 'RAG service is unavailable. Check server configuration and provider access.') from None
