"""Translate provider and RAG failures into HTTP responses."""
import httpx
import psycopg
from fastapi import HTTPException
from groq import APIConnectionError, APIStatusError, APITimeoutError
from openai import (
    APIConnectionError as OpenAIConnectionError,
    APIStatusError as OpenAIStatusError,
    APITimeoutError as OpenAITimeoutError,
)

from research.groq_budget import GroqBudgetExceeded
from research.scenario import ScenarioInputError


def retry_after_headers(error):
    delay = error.response.headers.get('retry-after', '')
    return {'Retry-After': delay} if delay.isdecimal() and len(delay) <= 6 else None


def execute(engine, operation, query):
    try:
        return operation(query) if callable(operation) else getattr(engine(), operation)(query)
    except GroqBudgetExceeded as error:
        if error.retry_after is not None:
            raise HTTPException(429, str(error), headers={'Retry-After': str(error.retry_after)}) from None
        raise HTTPException(422, str(error)) from None
    except (OpenAIStatusError, OpenAIConnectionError) as error:
        provider = {
            'generativelanguage.googleapis.com': 'Gemini',
            'api.z.ai': 'Z.ai',
        }.get(error.request.url.host, 'OpenRouter')
        if isinstance(error, OpenAITimeoutError):
            raise HTTPException(504, f'The {provider} model request timed out.') from None
        if isinstance(error, OpenAIConnectionError):
            raise HTTPException(503, f'Could not connect to {provider}.') from None
        if error.status_code == 429:
            headers = retry_after_headers(error)
            raise HTTPException(429, f'{provider} rate limit reached during generation. Retry after the provider limit resets.', headers=headers) from None
        if error.status_code in {401, 403} or (provider == 'Gemini' and error.code == 'API_KEY_INVALID'):
            raise HTTPException(503, f'{provider} rejected the configured credentials or model access.') from None
        if error.status_code == 402:
            raise HTTPException(503, f'The {provider} account or API key has insufficient credits.') from None
        raise HTTPException(503, f'{provider} could not complete the model request. Check model availability and provider settings.') from None
    except APITimeoutError:
        raise HTTPException(504, 'The Groq model request timed out.') from None
    except APIStatusError as error:
        if error.status_code == 429:
            headers = retry_after_headers(error)
            raise HTTPException(429, 'Groq rate limit reached during generation. Retry after the provider limit resets.', headers=headers) from None
        if error.status_code in {401, 403}:
            raise HTTPException(503, 'Groq rejected the configured credentials or model access.') from None
        raise HTTPException(503, 'Groq could not complete the model request.') from None
    except APIConnectionError:
        raise HTTPException(503, 'Could not connect to Groq.') from None
    except ScenarioInputError as error:
        raise HTTPException(400, str(error)) from None
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
