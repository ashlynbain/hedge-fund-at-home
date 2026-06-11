FROM python:3.11-slim

WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc && rm -rf /var/lib/apt/lists/*

COPY pyproject.toml README.md ./
COPY hedgekit ./hedgekit
COPY strategies ./strategies
COPY config/config.yaml.example ./config/config.yaml.example

RUN pip install --no-cache-dir -e .

ENV PYTHONUNBUFFERED=1
ENV HFAH_CONFIG=/app/config/config.yaml
ENV PYTHONPATH=/app

CMD ["python", "-m", "hedgekit.cli.run", "--once"]
