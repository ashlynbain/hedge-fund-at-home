from __future__ import annotations

import json
import os
from typing import Dict

from ..core.config import AwsCfg, get_settings
from ..core.logging import get_logger

logger = get_logger(__name__)


def load_secrets_into_env(cfg: AwsCfg | None = None) -> Dict[str, str]:
    """Load key/value secrets from AWS Secrets Manager into ``os.environ``.

    Expects the secret to be a JSON object, for example::

        {"IBKR_HOST": "127.0.0.1", "IBKR_PORT": "7497", "IBKR_CLIENT_ID": "1"}

    Existing environment variables are not overwritten.
    """
    cfg = cfg or get_settings().aws
    if not cfg.enabled or not cfg.secrets_name:
        return {}

    import boto3

    client = boto3.client("secretsmanager", region_name=cfg.region)
    resp = client.get_secret_value(SecretId=cfg.secrets_name)
    raw = resp.get("SecretString") or ""
    data = json.loads(raw)
    loaded: Dict[str, str] = {}
    for key, value in data.items():
        key = str(key)
        if key in os.environ:
            continue
        os.environ[key] = str(value)
        loaded[key] = str(value)
    logger.info("aws_secrets_loaded", extra={"keys": list(loaded.keys())})
    return loaded
