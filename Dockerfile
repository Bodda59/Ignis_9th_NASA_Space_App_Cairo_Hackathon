# Flame in Freefall: one container with the FastAPI backend and the built React app.
# Build from the repository root:  docker build -t flame-in-freefall .

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

RUN pip install --no-cache-dir uv==0.13.8

# Locked dependencies, except PyTorch and its GPU libraries. The locked Linux
# PyTorch wheel pulls several GB of CUDA packages, so the CPU build of the same
# version is installed first and satisfies sentence-transformers.
COPY backend/pyproject.toml backend/uv.lock ./
RUN uv pip install --system --no-cache torch==2.15.0 --index-url https://download.pytorch.org/whl/cpu \
 && uv export --locked --no-dev --no-hashes --no-emit-project --no-header --no-annotate \
    | grep -vE '^(torch|triton|nvidia-|cuda-)' > /tmp/requirements.txt \
 && uv pip install --system --no-cache -r /tmp/requirements.txt \
 && rm /tmp/requirements.txt

# Bake the embedding model into the image so a restart never downloads it.
RUN python -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('BAAI/bge-small-en-v1.5', device='cpu')"
ENV HF_HUB_OFFLINE=1

COPY backend/ ./
COPY --from=frontend /app/frontend/dist /app/frontend/dist

EXPOSE 8000
CMD ["python", "main.py", "serve", "--host", "0.0.0.0", "--port", "8000"]
