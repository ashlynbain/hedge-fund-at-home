from __future__ import annotations

from datetime import datetime
from typing import List

import pandas as pd
import yfinance as yf

from .logging import get_logger
from .schemas import Bar

logger = get_logger(__name__)


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
    out: dict[str, list[Bar]] = {}
    if len(symbols) == 1:
        sym = symbols[0]
        out[sym] = _frame_to_bars(sym, raw)
        return out
    for sym in symbols:
        if sym not in raw.columns.get_level_values(0):
            logger.warning("no_data", extra={"symbol": sym})
            continue
        frame = raw[sym].dropna()
        out[sym] = _frame_to_bars(sym, frame)
    return out


def _frame_to_bars(symbol: str, frame: pd.DataFrame) -> list[Bar]:
    bars: list[Bar] = []
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
