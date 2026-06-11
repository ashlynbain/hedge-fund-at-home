"""Educational pairs-trading demos for the learn-site code lab."""
from __future__ import annotations

import io
from typing import Any

import numpy as np
import pandas as pd

# Classic teaching pairs — names only; demo uses synthetic cointegrated series.
PAIR_PRESETS: dict[str, dict[str, str]] = {
    "ko_pep": {
        "label": "KO / PEP (consumer staples)",
        "a": "KO",
        "b": "PEP",
        "note": "Both beverage giants; spreads often mean-revert until a regime shock.",
    },
    "xom_cvx": {
        "label": "XOM / CVX (energy majors)",
        "a": "XOM",
        "b": "CVX",
        "note": "Oil beta drives both; residual spread can still oscillate.",
    },
    "gld_gdx": {
        "label": "GLD / GDX (gold vs miners)",
        "a": "GLD",
        "b": "GDX",
        "note": "Related but different beta; popular teaching pair with structural risk.",
    },
}


def _synthetic_pair(n: int = 252, seed: int = 42) -> tuple[pd.Series, pd.Series]:
    """Cointegrated random walk pair for offline demos (no network)."""
    rng = np.random.default_rng(seed)
    beta = 0.82
    spread = np.zeros(n)
    a = np.zeros(n)
    b = np.zeros(n)
    a[0], b[0] = 100.0, 82.0
    for t in range(1, n):
        spread[t] = 0.92 * spread[t - 1] + rng.normal(0, 0.35)
        shock = rng.normal(0, 0.4)
        a[t] = a[t - 1] + shock + 0.15 * spread[t]
        b[t] = b[t - 1] + beta * shock - 0.12 * spread[t] + rng.normal(0, 0.15)
    idx = pd.bdate_range("2023-01-01", periods=n)
    return pd.Series(a, index=idx, name="A"), pd.Series(b, index=idx, name="B")


def _fetch_pair(symbol_a: str, symbol_b: str, lookback: int) -> tuple[pd.Series, pd.Series]:
    import yfinance as yf

    need = max(lookback + 30, 120)
    raw = yf.download(
        [symbol_a, symbol_b],
        period=f"{need}d",
        progress=False,
        auto_adjust=True,
    )
    if raw.empty:
        raise ValueError("No market data returned")
    if isinstance(raw.columns, pd.MultiIndex):
        close = raw["Close"]
    else:
        close = raw
    a = close[symbol_a].dropna()
    b = close[symbol_b].dropna()
    aligned = pd.concat([a, b], axis=1, join="inner").dropna()
    if len(aligned) < lookback + 5:
        raise ValueError(f"Need at least {lookback + 5} aligned bars; got {len(aligned)}")
    return aligned.iloc[:, 0], aligned.iloc[:, 1]


def hedge_ratio(price_a: pd.Series, price_b: pd.Series) -> float:
    """OLS beta: regress A on B (educational; not rolling)."""
    x = price_b.to_numpy(dtype=float)
    y = price_a.to_numpy(dtype=float)
    x_mean = x.mean()
    denom = ((x - x_mean) ** 2).sum()
    if denom < 1e-12:
        return 1.0
    return float(((x - x_mean) * (y - y.mean())).sum() / denom)


def spread_zscore(price_a: pd.Series, price_b: pd.Series, lookback: int, beta: float | None = None) -> dict[str, Any]:
    beta = beta if beta is not None else hedge_ratio(price_a, price_b)
    spread = price_a - beta * price_b
    window = spread.iloc[-lookback:]
    mu = float(window.mean())
    sigma = float(window.std()) or 1e-9
    last = float(spread.iloc[-1])
    z = (last - mu) / sigma
    return {
        "beta": beta,
        "spread_last": last,
        "spread_mean": mu,
        "spread_std": sigma,
        "z": z,
        "spread": spread,
    }


def half_life(spread: pd.Series) -> float | None:
    """AR(1) half-life estimate on the spread (bars)."""
    s = spread.dropna()
    if len(s) < 10:
        return None
    lag = s.shift(1).iloc[1:]
    delta = s.diff().iloc[1:]
    x = lag.to_numpy(dtype=float)
    y = delta.to_numpy(dtype=float)
    denom = (x**2).sum()
    if denom < 1e-12:
        return None
    b = float((x * y).sum() / denom)
    if b >= 0:
        return None
    return float(-np.log(2) / b)


def build_pairs_snapshot(
    pair: str = "ko_pep",
    lookback: int = 60,
    entry_z: float = 2.0,
    exit_z: float = 0.5,
    use_live: bool = False,
) -> dict[str, Any]:
    """Chart-friendly pairs series for the code-lab replay floor."""
    preset = PAIR_PRESETS.get(pair, PAIR_PRESETS["ko_pep"])
    sym_a, sym_b = preset["a"], preset["b"]
    lookback = max(20, min(int(lookback), 200))
    entry_z = float(entry_z)
    exit_z = float(exit_z)

    source = "synthetic"
    if use_live:
        try:
            price_a, price_b = _fetch_pair(sym_a, sym_b, lookback)
            source = "yfinance"
        except Exception:
            price_a, price_b = _synthetic_pair()
            price_a.name, price_b.name = sym_a, sym_b
    else:
        price_a, price_b = _synthetic_pair()
        price_a.name, price_b.name = sym_a, sym_b

    beta = hedge_ratio(price_a, price_b)
    spread = price_a - beta * price_b
    dates = [d.date().isoformat() for d in spread.index]
    closes_a = [round(float(v), 4) for v in price_a]
    closes_b = [round(float(v), 4) for v in price_b]
    spreads = [round(float(v), 4) for v in spread]

    zscores: list[float | None] = [None] * len(spread)
    for i in range(lookback - 1, len(spread)):
        window = spread.iloc[i - lookback + 1 : i + 1]
        mu = float(window.mean())
        sigma = float(window.std()) or 1e-9
        zscores[i] = round((float(spread.iloc[i]) - mu) / sigma, 4)

    events: list[dict[str, Any]] = []
    position = 0
    for i, z in enumerate(zscores):
        if z is None:
            continue
        dt = dates[i]
        if position == 0:
            if z > entry_z:
                position = -1
                events.append(
                    {
                        "date": dt,
                        "type": "signal",
                        "action": "SHORT_SPREAD",
                        "z": z,
                        "detail": f"Short {sym_a}, long {sym_b} (spread rich)",
                    }
                )
            elif z < -entry_z:
                position = 1
                events.append(
                    {
                        "date": dt,
                        "type": "signal",
                        "action": "LONG_SPREAD",
                        "z": z,
                        "detail": f"Long {sym_a}, short {sym_b} (spread cheap)",
                    }
                )
        elif abs(z) < exit_z:
            events.append(
                {
                    "date": dt,
                    "type": "signal",
                    "action": "EXIT",
                    "z": z,
                    "detail": "Spread reverted — flatten both legs",
                }
            )
            position = 0

    hl = half_life(spread)
    last_z = next((z for z in reversed(zscores) if z is not None), 0.0)

    return {
        "ok": True,
        "pair": pair,
        "label": preset["label"],
        "symbol_a": sym_a,
        "symbol_b": sym_b,
        "source": source,
        "beta": round(beta, 4),
        "lookback": lookback,
        "entry_z": entry_z,
        "exit_z": exit_z,
        "half_life": round(hl, 2) if hl is not None else None,
        "stats": {
            "bars": len(dates),
            "signals": len(events),
            "z_last": last_z,
        },
        "dates": dates,
        "leg_a": closes_a,
        "leg_b": closes_b,
        "spread": spreads,
        "zscore": zscores,
        "events": events,
    }


def run_pairs_demo(
    pair: str = "ko_pep",
    lookback: int = 60,
    entry_z: float = 2.0,
    use_live: bool = False,
) -> str:
    """Print an educational pairs spread report."""
    buf = io.StringIO()
    preset = PAIR_PRESETS.get(pair, PAIR_PRESETS["ko_pep"])
    sym_a, sym_b = preset["a"], preset["b"]
    lookback = max(20, min(int(lookback), 200))
    entry_z = float(entry_z)

    buf.write("Pairs spread demo (educational only — not financial advice)\n")
    buf.write("=" * 56 + "\n")
    buf.write(f"Pair preset: {preset['label']}\n")
    buf.write(f"Note: {preset['note']}\n\n")

    if use_live:
        try:
            price_a, price_b = _fetch_pair(sym_a, sym_b, lookback)
            buf.write(f"Data source: yfinance ({sym_a}, {sym_b}), {len(price_a)} aligned bars\n")
        except Exception as exc:
            buf.write(f"Live fetch failed ({exc}); falling back to synthetic series.\n")
            price_a, price_b = _synthetic_pair()
            price_a.name, price_b.name = sym_a, sym_b
    else:
        price_a, price_b = _synthetic_pair()
        price_a.name, price_b.name = sym_a, sym_b
        buf.write(f"Data source: synthetic cointegrated series ({len(price_a)} bars)\n")

    stats = spread_zscore(price_a, price_b, lookback)
    hl = half_life(stats["spread"])
    z = stats["z"]

    buf.write(f"\nHedge ratio (OLS beta): {stats['beta']:.4f}\n")
    buf.write(f"Spread = {sym_a} − beta × {sym_b}\n")
    buf.write(f"Lookback: {lookback} bars\n")
    buf.write(f"Spread last: {stats['spread_last']:.4f}\n")
    buf.write(f"Spread mean (window): {stats['spread_mean']:.4f}\n")
    buf.write(f"Spread std (window): {stats['spread_std']:.4f}\n")
    buf.write(f"Z-score: {z:.3f}\n")
    if hl is not None:
        buf.write(f"Half-life estimate: {hl:.1f} bars\n")
    else:
        buf.write("Half-life estimate: n/a (spread may not look mean-reverting)\n")

    buf.write("\n--- Signal sketch (teaching only) ---\n")
    if z > entry_z:
        buf.write(
            f"z > {entry_z}: spread rich → long {sym_b}, short {sym_a} (fade the divergence)\n"
        )
    elif z < -entry_z:
        buf.write(
            f"z < −{entry_z}: spread cheap → long {sym_a}, short {sym_b}\n"
        )
    else:
        buf.write(f"|z| ≤ {entry_z}: no entry in this toy rule; wait for stretch.\n")

    buf.write("\nCosts matter: two legs, borrow on shorts, slippage on both sides.\n")
    buf.write("Past simulated behavior does not predict future performance.\n")
    return buf.getvalue()


def run_snippet(snippet_id: str, params: dict[str, Any] | None = None) -> str:
    """Run a whitelisted teaching snippet by id."""
    params = params or {}
    if snippet_id == "pairs_demo":
        return run_pairs_demo(
            pair=str(params.get("pair", "ko_pep")),
            lookback=int(params.get("lookback", 60)),
            entry_z=float(params.get("entry_z", 2.0)),
            use_live=bool(params.get("use_live", False)),
        )
    if snippet_id == "hedge_ratio":
        a, b = _synthetic_pair(120)
        beta = hedge_ratio(a, b)
        return (
            "Hedge ratio walkthrough (synthetic data)\n"
            f"OLS beta (A regressed on B): {beta:.4f}\n"
            "Spread = A − beta × B is the quantity we mean-revert trade.\n"
        )
    if snippet_id == "zscore_single":
        rng = np.random.default_rng(7)
        closes = 100 + np.cumsum(rng.normal(0, 1, 25))
        last = float(closes[-1])
        mu = float(closes.mean())
        sigma = float(closes.std()) or 1e-9
        z = (last - mu) / sigma
        return (
            "Single-symbol z-score (like the example mean reversion strategy)\n"
            f"Last close: {last:.2f}\n"
            f"Mean ({len(closes)} bars): {mu:.2f}\n"
            f"Std: {sigma:.2f}\n"
            f"Z-score: {z:.2f}\n"
        )
    raise ValueError(f"Unknown snippet: {snippet_id}")
