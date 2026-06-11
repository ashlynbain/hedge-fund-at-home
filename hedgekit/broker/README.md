# Broker adapters

The runner calls `build_broker()` in `factory.py` after risk checks approve an order.

## Shipped adapters

| Adapter | When used | Module |
| ------- | --------- | ------ |
| **Simulated** | `mode: simulated`, or paper without `IBKR_USE_REAL` | `simulated.py` |
| **IBKR** | `mode: paper` or `live` + `IBKR_USE_REAL=true` | `ibkr.py` |

## Your broker (placeholder)

1. Copy `custom_broker.py.example` into your own package.
2. Implement `submit(self, intent: OrderIntent) -> OrderStatus`.
3. Set environment variables:

```bash
BROKER_ADAPTER=custom
BROKER_CUSTOM_MODULE=my_brokers.alpaca:AlpacaBroker
```

4. Keep `ENABLE_LIVE_TRADING=false` for paper APIs.

**Not financial advice.** You are responsible for API keys, compliance, and testing.
