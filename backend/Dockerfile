# ============================================================================
# Antigravity Food Scanner — Multi-Stage Production Dockerfile
# ============================================================================
# Stage 1 (builder): Install all Python dependencies in an isolated layer.
# Stage 2 (runtime): Copy only the installed packages + app code into a
#   minimal image for a small, secure production container.
# ============================================================================

# ── Stage 1: Builder ────────────────────────────────────────────────────────
FROM python:3.12-slim AS builder

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install system build dependencies required by some Python packages
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        build-essential \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender-dev && \
    rm -rf /var/lib/apt/lists/*

# Create a virtual environment to isolate dependencies
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt


# ── Stage 2: Runtime ────────────────────────────────────────────────────────
FROM python:3.12-slim AS runtime

# Prevent Python from writing .pyc files and enable unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Install only the minimal runtime libraries needed by opencv-headless
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
        libglib2.0-0 \
        libsm6 \
        libxext6 \
        libxrender1 && \
    rm -rf /var/lib/apt/lists/*

# Copy the virtual environment from the builder stage
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Set the working directory
WORKDIR /app

# Copy application source code
COPY app/ ./app/

# Create a directory for the YOLO model
RUN mkdir -p ./models

# Create a non-root user for security
RUN groupadd --gid 1000 scanner && \
    useradd --uid 1000 --gid scanner --shell /bin/bash --create-home scanner && \
    chown -R scanner:scanner /app

USER scanner

# Expose the API port
EXPOSE 8000

# Health check — ensures the container is serving
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')" || exit 1

# Production uvicorn with 4 workers, graceful shutdown, and access logging
CMD ["uvicorn", "app.main:app", \
     "--host", "0.0.0.0", \
     "--port", "8000", \
     "--workers", "4", \
     "--timeout-graceful-shutdown", "30", \
     "--access-log"]
