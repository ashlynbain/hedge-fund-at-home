from hedgekit.broker.simulated import SimulatedBroker
from hedgekit.core.schemas import OrderIntent, OrderLeg, OrderSide


def test_simulated_fill():
    broker = SimulatedBroker()
    intent = OrderIntent(
        strategy_name="test",
        mode="simulated",
        legs=[OrderLeg(symbol="SPY", side=OrderSide.BUY, quantity=5, limit_price=400)],
    )
    status = broker.submit(intent)
    assert status.status.value == "FILLED"
    assert "SIM-" in status.broker_order_ids[0]
