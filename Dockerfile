# Flame in Freefall: one container with the FastAPI backend and the built React app.
# Build from the repository root:  docker build -t flame-in-freefall .
# Versions come from frontend/package-lock.json and backend/uv.lock; no settings or secrets are baked in.

# ── 1. Frontend build ───────────────────────────────────────────────
FROM node:22-slim AS frontend
WORKDIR /app/frontend
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# ── 2. Backend runtime ──────────────────────────────────────────────
FROM python:3.14-slim
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    HF_HOME=/app/backend/.cache/huggingface \
    FRONTEND_DIST=/app/frontend/dist
WORKDIR /app/backend

# uv reads backend/uv.lock. Pass --build-arg UV_VERSION=x.y.z to pin it.
ARG UV_VERSION=""
RUN pip install --no-cache-dir "uv${UV_VERSION:+==$UV_VERSION}"

# Locked dependencies. The locked Linux PyTorch wheel pulls several GB of CUDA
# packages, so the CPU build of the same locked version is installed instead,
# and the GPU-only packages are left out of the export.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv export --locked --no-dev --no-hashes --no-emit-project --no-header --no-annotate > /tmp/locked.txt \
 && torch=$(grep -E '^torch==' /tmp/locked.txt | cut -d';' -f1 | tr -d ' ') \
 && test -n "$torch" \
 && uv pip install --system --no-cache "$torch" --index-url https://download.pytorch.org/whl/cpu \
 && grep -vE '^(torch|triton|nvidia-|cuda-)' /tmp/locked.txt > /tmp/requirements.txt \
 && uv pip install --system --no-cache -r /tmp/requirements.txt \
 && rm /tmp/locked.txt /tmp/requirements.txt

# Bake the embedding model in, so a restart never downloads it. The app's own
# loader names the model (EMBEDDING_MODEL or its default), so the name lives in one place.
COPY backend/research/__init__.py backend/research/providers.py ./research/
RUN python -c "from research.providers import get_embeddings; print('Embedding model ready:', get_embeddings().model_name)"
ENV HF_HUB_OFFLINE=1

COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist

EXPOSE 8000
CMD ["python", "main.py", "serve", "--host", "0.0.0.0", "--port", "8000"]
