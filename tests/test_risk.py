from hedgekit.core.schemas import OrderIntent, OrderLeg, OrderSide
from hedgekit.risk.gate import RiskGate


def test_kill_switch_rejects():
    import os
    os.environ["KILL_SWITCH"] = "true"
    gate = RiskGate()
    intent = OrderIntent(
        strategy_name="t",
        legs=[OrderLeg(symbol="SPY", side=OrderSide.BUY, quantity=1, limit_price=100)],
    )
    v = gate.evaluate(intent, {}, {"SPY": 100})
    assert not v.approved
    del os.environ["KILL_SWITCH"]


def test_within_limits_approves():
    gate = RiskGate()
    intent = OrderIntent(
        strategy_name="t",
        legs=[OrderLeg(symbol="SPY", side=OrderSide.BUY, quantity=1, limit_price=100)],
    )
    v = gate.evaluate(intent, {}, {"SPY": 100})
    assert v.approved
