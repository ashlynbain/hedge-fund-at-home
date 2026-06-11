from __future__ import annotations

import sys
from pathlib import Path
from typing import Any

# strategies/ lives at repo root; learn_ui may run with another cwd
_ROOT = Path(__file__).resolve().parents[2]
if str(_ROOT) not in sys.path:
    sys.path.insert(0, str(_ROOT))

from ..broker.simulated import SimulatedBroker
from ..core.config import get_settings
from ..core.marketdata import fetch_daily_bars
from ..risk.gate import RiskGate
from ..strategy.base import StrategyContext
from ..strategy.registry import load_strategy


def build_trading_snapshot(start: str, end: str) -> dict[str, Any]:
    """Run a simulated walk and return chart-friendly series (education only)."""
    settings = get_settings()
    strategy = load_strategy(settings.strategy)
    broker = SimulatedBroker()
    risk = RiskGate()
    symbols = list(settings.strategy.symbols)
    bars_by_sym = fetch_daily_bars(symbols, start, end)
    if not bars_by_sym or not bars_by_sym.get(symbols[0]):
        return {"ok": False, "error": "No market data. Check symbols and dates."}

    primary = symbols[0]
    n_bars = len(bars_by_sym[primary])
    ohlcv: list[dict[str, Any]] = []
    equity_curve: list[dict[str, Any]] = []
    events: list[dict[str, Any]] = []
    positions: dict[str, float] = {}
    cash = 100_000.0
    fills_count = 0
    rejects = 0

    for i in range(60, n_bars):
        window = {sym: series[: i + 1] for sym, series in bars_by_sym.items()}
        bar = window[primary][-1]
        last_px = {sym: window[sym][-1].close for sym in symbols if window.get(sym)}
        pos_value = sum(positions.get(s, 0.0) * last_px.get(s, 0.0) for s in symbols)
        equity_curve.append(
            {
                "date": bar.timestamp.date().isoformat(),
                "equity": round(cash + pos_value, 2),
                "close": round(bar.close, 2),
            }
        )
        ohlcv.append(
            {
                "date": bar.timestamp.date().isoformat(),
                "open": round(bar.open, 2),
                "high": round(bar.high, 2),
                "low": round(bar.low, 2),
                "close": round(bar.close, 2),
                "volume": int(bar.volume),
            }
        )

        ctx = StrategyContext(
            symbols=symbols,
            bars=window,
            positions=dict(positions),
            params=settings.strategy.params,
        )
        for intent in strategy.on_bars(ctx):
            intent.mode = "simulated"  # type: ignore[assignment]
            verdict = risk.evaluate(intent, positions, last_px)
            if not verdict.approved:
                rejects += 1
                leg0 = intent.legs[0] if intent.legs else None
                events.append(
                    {
                        "date": bar.timestamp.date().isoformat(),
                        "type": "reject",
                        "symbol": leg0.symbol if leg0 else "?",
                        "side": leg0.side.value if leg0 else "?",
                        "qty": leg0.quantity if leg0 else 0,
                        "reason": verdict.reason or "risk",
                    }
                )
                continue
            status = broker.submit(intent)
            if status.fills:
                fills_count += 1
                risk.record_fill()
                for leg in status.fills:
                    delta = leg.quantity if leg.side.value == "BUY" else -leg.quantity
                    positions[leg.symbol] = positions.get(leg.symbol, 0.0) + delta
                    px = leg.limit_price or last_px.get(leg.symbol, 0.0)
                    notional = leg.quantity * px
                    if leg.side.value == "BUY":
                        cash -= notional
                    else:
                        cash += notional
                    events.append(
                        {
                            "date": bar.timestamp.date().isoformat(),
                            "type": "fill",
                            "symbol": leg.symbol,
                            "side": leg.side.value,
                            "qty": leg.quantity,
                            "price": round(px, 2),
                        }
                    )

    if not ohlcv:
        return {
            "ok": False,
            "error": "Not enough bars in this date range (strategy needs ~60 trading days of warmup). Try a longer range.",
        }

    last = ohlcv[-1]
    return {
        "ok": True,
        "symbols": symbols,
        "primary": primary,
        "strategy": strategy.name,
        "start": start,
        "end": end,
        "mode": "simulated",
        "ohlcv": ohlcv,
        "equity": equity_curve,
        "events": events[-80:],
        "quote": {
            "symbol": primary,
            "last": last.get("close", 0),
            "change": round(
                (last.get("close", 0) - ohlcv[-2]["close"]) if len(ohlcv) > 1 else 0,
                2,
            ),
        },
        "stats": {
            "fills": fills_count,
            "rejects": rejects,
            "bars": len(ohlcv),
            "final_equity": equity_curve[-1]["equity"] if equity_curve else cash,
        },
    }
