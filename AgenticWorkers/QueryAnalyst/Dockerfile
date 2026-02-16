# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies for psycopg2 and other packages
RUN apt-get update && apt-get install -y \
    gcc \
    postgresql-client \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies with CPU-only torch to avoid massive CUDA downloads
RUN pip install --no-cache-dir \
    torch --index-url https://download.pytorch.org/whl/cpu && \
    pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Create outputs directory for generated reports
RUN mkdir -p outputs

# Set environment variables
ENV PYTHONUNBUFFERED=1
ENV LANGSMITH_SKIP_TRACING_PROMPT=true
ENV LANGSMITH_TRACING=false
ENV LANGCHAIN_TRACING_V2=false

# Run the worker
CMD ["python", "worker.py"]
