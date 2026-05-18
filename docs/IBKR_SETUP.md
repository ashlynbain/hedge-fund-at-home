# Interactive Brokers setup (optional education lab)

**This is not financial advice.** This section is for learners who finished
[LEARNING_PATH.md](LEARNING_PATH.md) stages 1 through 6 in **simulated** mode.

Use IBKR **paper** accounts only as a broker API lab. **Do not use real money**
to complete the Hedge Fund at Home curriculum. Paper accounts can still behave
differently from live markets. Live trading can lose all capital.

## When to use IBKR

Use IBKR only after you can explain the full code path in `hedgekit/execution/runner.py`
and you have completed the simulated learning stages.

| Goal | Recommended mode |
| ---- | ---------------- |
| Learning the framework | `simulated` (default) |
| Broker API integration test | `paper` + TWS paper port |
| Real money | Not recommended until professional review; requires `live` + `ENABLE_LIVE_TRADING=true` |

## TWS or IB Gateway

1. Install Trader Workstation or IB Gateway from Interactive Brokers.
2. Enable API connections in TWS settings (Configure -> API -> Settings).
3. Note the socket port:
   - TWS paper: `7497` (default in `.env.example`)
   - TWS live: `7496`
   - Gateway paper: `4002`

## Environment

```bash
IBKR_HOST=127.0.0.1
IBKR_PORT=7497
IBKR_CLIENT_ID=1
IBKR_USE_REAL=true
```

In `config/config.yaml`:

```yaml
mode: paper
ibkr:
  use_real: true
```

Keep `ENABLE_LIVE_TRADING=false` for paper.

## Simulated vs paper reminder

- **Simulated**: no IBKR connection; synthetic fills.
- **Paper**: orders sent to IBKR paper account when TWS is running and
  `IBKR_USE_REAL=true`.

Always confirm order previews in TWS when testing. **Not financial advice.**

## Live trading (discouraged without professional oversight)

Requires both:

```yaml
mode: live
```

and

```bash
ENABLE_LIVE_TRADING=true
```

The framework will still apply risk gates, but gates are not a substitute for your
own operational controls.
