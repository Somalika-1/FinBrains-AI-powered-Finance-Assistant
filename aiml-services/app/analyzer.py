from __future__ import annotations
from typing import Dict, List, Tuple
from builtins import round


class RuleAnalyzer:
    """Deterministic financial metrics and flags."""

    def analyze(self, monthly_income: float, expenses_by_cat: Dict[str, float], monthly_savings: float,
                liabilities: List[dict] | None, emergency_fund_balance: float | None) -> Tuple[Dict[str, float], List[str]]:
        income = monthly_income or 0.0
        total_expenses = sum((v or 0.0) for v in expenses_by_cat.values()) if expenses_by_cat else 0.0
        # If monthly_savings not provided, compute as income - total_expenses
        savings = monthly_savings if monthly_savings is not None else (income - total_expenses)
        savings = savings or 0.0
        savings_rate = round(((savings / income) * 100.0), 2) if income > 0 else 0.0

        metrics = {
            "income": income,
            "totalExpenses": total_expenses,
            "savings": savings,
            "savingsRatePct": savings_rate,
        }

        flags: List[str] = []
        if income <= 0:
            flags.append("No income recorded this month")
        if savings <= 0:
            flags.append("Overspending detected (savings ≤ 0)")

        return metrics, flags
