from __future__ import annotations

from datetime import datetime
from typing import List

import pandas as pd
import yfinance as yf

from .logging import get_logger
from .schemas import Bar

logger = get_logger(__name__)

_OHLCV = ("Open", "High", "Low", "Close", "Volume")


def fetch_daily_bars(symbols: List[str], start: str, end: str) -> dict[str, list[Bar]]:
    if not symbols:
        return {}
    raw = yf.download(
        " ".join(symbols),
        start=start,
        end=end,
        progress=False,
        auto_adjust=True,
        group_by="ticker",
    )
    if raw is None or raw.empty:
        logger.warning("no_data", extra={"symbol": ",".join(symbols)})
        return {}

    out: dict[str, list[Bar]] = {}
    if len(symbols) == 1:
        sym = symbols[0]
        frame = _normalize_ohlcv(raw, sym)
        if not frame.empty:
            out[sym] = _frame_to_bars(sym, frame)
        return out

    for sym in symbols:
        frame = _extract_symbol_frame(raw, sym)
        if frame is None or frame.empty:
            logger.warning("no_data", extra={"symbol": sym})
            continue
        out[sym] = _frame_to_bars(sym, frame)
    return out


def _extract_symbol_frame(raw: pd.DataFrame, symbol: str) -> pd.DataFrame | None:
    if not isinstance(raw.columns, pd.MultiIndex):
        return _normalize_ohlcv(raw, symbol) if len(raw.columns) else None
    names = list(raw.columns.names or [])
    if "Ticker" in names and symbol in raw.columns.get_level_values("Ticker"):
        return _normalize_ohlcv(raw.xs(symbol, axis=1, level="Ticker"), symbol)
    if symbol in raw.columns.get_level_values(0):
        return _normalize_ohlcv(raw[symbol], symbol)
    return None


def _normalize_ohlcv(frame: pd.DataFrame, symbol: str) -> pd.DataFrame:
    df = frame.copy()
    if isinstance(df.columns, pd.MultiIndex):
        names = list(df.columns.names or [])
        if names == ["Price", "Ticker"]:
            df.columns = df.columns.get_level_values("Price")
        elif names == ["Ticker", "Price"] and symbol in df.columns.get_level_values(0):
            df = df[symbol].copy()
        elif df.columns.nlevels == 2:
            df.columns = df.columns.get_level_values(-1)

    rename = {}
    for col in df.columns:
        if isinstance(col, str):
            key = col.strip().lower()
            if key == "open":
                rename[col] = "Open"
            elif key == "high":
                rename[col] = "High"
            elif key == "low":
                rename[col] = "Low"
            elif key == "close":
                rename[col] = "Close"
            elif key == "volume":
                rename[col] = "Volume"
    if rename:
        df = df.rename(columns=rename)
    return df


def _frame_to_bars(symbol: str, frame: pd.DataFrame) -> list[Bar]:
    bars: list[Bar] = []
    missing = [c for c in ("Open", "High", "Low", "Close") if c not in frame.columns]
    if missing:
        logger.warning("bad_columns", extra={"symbol": symbol, "cols": list(frame.columns)})
        return bars

    for ts, row in frame.iterrows():
        bars.append(
            Bar(
                symbol=symbol,
                timestamp=datetime.fromisoformat(str(ts.date())),
                open=float(row["Open"]),
                high=float(row["High"]),
                low=float(row["Low"]),
                close=float(row["Close"]),
                volume=float(row.get("Volume", 0) or 0),
            )
        )
    return bars
