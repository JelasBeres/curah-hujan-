"""Unit tests for rating curve calculation."""

import pytest
from app.services import calculate_discharge


def test_calculate_discharge_normal():
    q = calculate_discharge(2.0)
    assert q > 0
    assert q == 20.268 * ((2.0 + 0.15) ** 2.157)


def test_calculate_discharge_low_water():
    q = calculate_discharge(-0.1)
    assert q > 0
    assert q < 1.0


def test_calculate_discharge_near_zero():
    q = calculate_discharge(-0.14)
    assert q > 0
    assert q < 0.1


def test_calculate_discharge_invalid_negative():
    with pytest.raises(ValueError):
        calculate_discharge(-0.16)


def test_calculate_discharge_none():
    with pytest.raises(ValueError):
        calculate_discharge(None)


def test_calculate_discharge_high_water():
    q = calculate_discharge(6.0)
    assert q > 1000  # High discharge for high water


def test_calculate_discharge_monotonic():
    """Verify that higher TMA always gives higher discharge."""
    values = [-0.14, -0.1, 0, 0.5, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0]
    discharges = [calculate_discharge(v) for v in values]
    for i in range(1, len(discharges)):
        assert discharges[i] > discharges[i-1], \
            f"Discharge not monotonic at index {i}: {discharges[i-1]} >= {discharges[i]}"


def test_rating_curve_precision():
    q = calculate_discharge(2.0)
    # Q = 20.268 * (2.15)^2.157
    expected = 20.268 * (2.15 ** 2.157)
    assert abs(q - expected) < 0.01
