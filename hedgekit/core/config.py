from __future__ import annotations

import os
import re
from functools import lru_cache
from pathlib import Path
from typing import Any, List, Optional

import yaml
from dotenv import load_dotenv
from pydantic import BaseModel, Field

load_dotenv(override=False)

_ENV_RE = re.compile(r"\$\{([A-Z0-9_]+)(?::-(.*?))?\}")


def _substitute_env(obj: Any) -> Any:
    if isinstance(obj, dict):
        return {k: _substitute_env(v) for k, v in obj.items()}
    if isinstance(obj, list):
        return [_substitute_env(v) for v in obj]
    if isinstance(obj, str):
        def repl(m: re.Match) -> str:
            return os.environ.get(m.group(1), m.group(2) or "")
        out = _ENV_RE.sub(repl, obj)
        if out.lower() in {"true", "false"}:
            return out.lower() == "true"
        if out.isdigit():
            return int(out)
        return out
    return obj


class RiskCfg(BaseModel):
    max_position_per_symbol: float = 10_000
    max_gross_exposure: float = 50_000
    max_daily_loss: float = 500
    max_trades_per_day: int = 50


class ExecutionCfg(BaseModel):
    default_order_type: str = "LMT"
    limit_offset_bps: float = 5


class IbkrCfg(BaseModel):
    host: str = "127.0.0.1"
    port: int = 7497
    client_id: int = 1
    use_real: bool = False


class AwsCfg(BaseModel):
    enabled: bool = False
    region: str = "us-east-1"
    secrets_name: str = ""


class StrategyCfg(BaseModel):
    module: str = "strategies.example_mean_reversion.strategy"
    class_name: str = "ExampleMeanReversionStrategy"
    symbols: List[str] = Field(default_factory=lambda: ["SPY"])
    params: dict = Field(default_factory=dict)


class Settings(BaseModel):
    mode: str = "simulated"  # simulated | paper | live
    log_level: str = "INFO"
    strategy: StrategyCfg = Field(default_factory=StrategyCfg)
    risk: RiskCfg = Field(default_factory=RiskCfg)
    execution: ExecutionCfg = Field(default_factory=ExecutionCfg)
    ibkr: IbkrCfg = Field(default_factory=IbkrCfg)
    aws: AwsCfg = Field(default_factory=AwsCfg)
    poll_seconds: int = 60
    bar_lookback_days: int = 120

    def live_trading_enabled(self) -> bool:
        return self.mode == "live" and os.getenv("ENABLE_LIVE_TRADING", "").lower() == "true"

    def kill_switch_engaged(self) -> bool:
        return os.getenv("KILL_SWITCH", "").lower() == "true"

    def effective_execution_mode(self) -> str:
        if self.mode == "simulated":
            return "simulated"
        if self.mode == "paper":
            return "paper"
        if self.live_trading_enabled():
            return "live"
        return "paper"


def _config_path() -> Path:
    env = os.getenv("HFAH_CONFIG")
    if env:
        return Path(env)
    for base in (Path.cwd(), Path(__file__).resolve().parents[2]):
        cand = base / "config" / "config.yaml"
        if cand.exists():
            return cand
    return Path("config/config.yaml")


def load_settings(path: Path | str | None = None) -> Settings:
    p = Path(path) if path else _config_path()
    if not p.exists():
        return Settings()
    raw = yaml.safe_load(p.read_text()) or {}
    return Settings.model_validate(_substitute_env(raw))


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return load_settings()
