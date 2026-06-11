# Education overview

**This is not financial advice.** Hedge Fund at Home is learning software. It
teaches how systematic trading systems are structured. It does not tell you what
to buy or sell, and it is not a path to guaranteed income.

## What you are learning

Professional quant and systematic shops organize work into repeatable steps:

1. **Data**: clean prices and volumes you can trust.
2. **Signal**: rules that turn data into intended positions.
3. **Risk**: limits so one bug or bad day cannot blow up the book.
4. **Execution**: sending orders to a broker (or simulating them first).
5. **Operations**: logs, kill switches, and configuration you can audit.

This repository is a small, readable version of that pipeline. You practice on
**simulated** fills by default. Paper trading with Interactive Brokers is an
optional advanced lab. **Do not use real money** until you have completed your
own education, paper testing, and professional advice if you choose to trade at all.

## Recommended learning path

| Stage | Goal | Use this repo |
| ----- | ---- | ------------- |
| 1 | Understand the loop | `docs/LEARNING_PATH.md` stages 1 to 3 |
| 2 | Run simulated code | `python -m hedgekit.cli.run --once` |
| 3 | Study the example strategy | `strategies/example_mean_reversion/` |
| 4 | Implement your own rules | `docs/STRATEGY_GUIDE.md` |
| 5 | Optional paper lab | `docs/IBKR_SETUP.md` (paper only) |

Stages 1 through 4 are enough for most learners. Stage 5 is optional and still
**not financial advice**.

## Core topics to study

Work through these in any order, but do not skip risk and backtesting bias.

### Markets and data

- What a bar (OHLCV) represents and why corporate actions matter.
- Difference between adjusted and unadjusted prices.
- Survivorship bias in free historical databases.
- Market hours, halts, and why liquidity varies by time of day.

**Research yourself:** Look up "survivorship bias backtest", "corporate actions
adjustment", and read your data vendor's methodology page (for example Yahoo
Finance via `yfinance` limitations).

### Signals and statistics

- Mean reversion vs momentum: when each idea fails.
- Z-scores and rolling windows: stability vs overfitting.
- Correlation vs cointegration for pairs (conceptual level is fine to start).
- Stationarity and why it matters for time series rules.

**Research yourself:** "Engle-Granger cointegration intuitive", "overfitting in
quantitative trading", "multiple testing bias finance".

### Backtesting honesty

- In-sample vs out-of-sample testing.
- Look-ahead bias and peeking at the future.
- Transaction costs, slippage, and borrow fees (even in simulation, model them).
- Why a high Sharpe ratio on history often shrinks live.

**Research yourself:** "backtest overfitting Bailey Lopez de Prado", "deflated
Sharpe ratio".

### Risk management

- Position limits per symbol and gross exposure.
- Daily loss limits and kill switches.
- Concentration risk and factor exposure (even with two stocks).
- Difference between paper, simulated, and live fills.

**Research yourself:** "risk of ruin trading", "Kelly criterion caution retail",
"maximum drawdown interpretation".

### Execution and brokers

- Market vs limit orders.
- Paper trading accounts vs simulated internal fills.
- API session rules for Interactive Brokers (TWS / Gateway).
- Partial fills and why backtests lie without friction.

**Research yourself:** IBKR paper trading documentation, "market impact retail
size".

### Software engineering for trading

- Idempotent orders and logging.
- Configuration vs secrets (`.env`, AWS Secrets Manager).
- Testing strategy logic with synthetic data before live data.
- Why a single-process runner is easier to learn than microservices first.

**Research yourself:** "idempotency trading systems", "twelve-factor app config".

## Questions to answer in a learning journal

Write short answers as you use the kit. None of these imply you should trade
real money.

1. What does my example strategy do on a flat market? On a crash window?
2. How many parameters did I tune by hand? Could I be overfitting?
3. What happens if I double position size in config? Does risk gate block it?
4. What is different between a simulated fill and an IBKR paper fill?
5. If `KILL_SWITCH=true`, where in the code is the order rejected?
6. What would I need to monitor if this ran unattended (and should it)?

## Suggested external reading (independent study)

These are common references in systematic finance education. Inclusion is not an
endorsement and not financial advice.

- Ernie Chan, *Algorithmic Trading* (workflow and pairs introduction).
- Marcos Lopez de Prado, *Advances in Financial Machine Learning* (backtest
  pitfalls and validation; advanced).
- Interactive Brokers campus and API documentation (paper accounts).
- SEC and FINRA investor education pages on market risk and options (if you
  expand beyond equities).

## What this kit deliberately does not teach

- Tax reporting for traders.
- Fund formation, LP agreements, or raising outside capital.
- High-frequency market making or colocation.
- Guaranteed profitability or "passive income" narratives.

**Not financial advice.** If you choose to trade with real money after your own
due diligence, that decision is yours alone. The default and recommended mode
for education is **simulated**. Paper is optional. Live mode exists only behind
explicit gates and is discouraged for learners.
