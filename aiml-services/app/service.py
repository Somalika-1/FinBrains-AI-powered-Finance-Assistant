from __future__ import annotations
from typing import Dict, List, Optional
from builtins import round

from .analyzer import RuleAnalyzer
from .prompt import build_prompt
from .llm import LLMClient


def _default_summary(m: Dict[str, float]) -> str:
    income = float(m.get("income", 0) or 0)
    exp = float(m.get("totalExpenses", 0) or 0)
    savings = float(m.get("savings", income - exp))
    if income <= 0:
        return f"You spent {exp:.0f} this month. Add your income to get accurate savings insights."
    sr = float(m.get("savingsRatePct", 0) or 0)
    return f"You earned {income:.0f} this month and spent {exp:.0f}, saving {savings:.0f} ({sr:.2f}%)."


def _default_insights(m: Dict[str, float], flags: List[str], expenses_by_cat: Dict[str, float], expense_trend_pct: float | None = None) -> List[str]:
    out: List[str] = []
    income = float(m.get("income", 0) or 0)
    exp = float(m.get("totalExpenses", 0) or 0)
    sr = float(m.get("savingsRatePct", 0) or 0)
    if income > 0:
        out.append(f"Savings rate is {sr:.2f}% this month.")
    # Top categories (up to 3)
    if expenses_by_cat:
        top = sorted(((k, float(v or 0)) for k, v in expenses_by_cat.items()), key=lambda x: x[1], reverse=True)[:3]
        if top:
            share_total = sum(v for _, v in top)
            parts = [f"{k} ({v:.0f})" for k, v in top]
            out.append("Top spending categories: " + ", ".join(parts) + ".")
    # Trend vs last month if available
    if expense_trend_pct is not None:
        try:
            pct = float(expense_trend_pct)
            if pct > 0:
                out.append(f"Spending increased by {pct:.0f}% vs last month.")
            elif pct < 0:
                out.append(f"Spending decreased by {abs(pct):.0f}% vs last month.")
            else:
                out.append("Spending unchanged vs last month.")
        except Exception:
            pass
    if not flags:
        out.append("No critical issues detected.")
    else:
        for f in flags:
            out.append(f)
    return out


def _default_recommendations(m: Dict[str, float], flags: List[str]) -> List[str]:
    recs: List[str] = []
    income = float(m.get('income', 0) or 0)
    exp = float(m.get('totalExpenses', 0) or 0)
    savings = float(m.get('savings', income - exp))
    sr = float(m.get('savingsRatePct', 0) or 0)
    if income <= 0:
        recs.append("Add your monthly income (use the 'Monthly Income' category) to unlock accurate savings insights.")
    if savings <= 0:
        recs.append("Reduce discretionary spending and set a weekly cap to avoid overspending.")
    if income > 0 and sr < 20.0:
        recs.append("Aim for a 20% savings rate by trimming non-essential costs and scheduling an auto-transfer after payday.")
    if not recs:
        recs.append("Maintain consistency; review categories weekly to keep spending aligned with goals.")
    return recs[:3]


def _default_closing() -> str:
    return "Small consistent steps add up—you\'re on the right track!"


def _impact_score(flags: List[str]) -> float:
    f = len(flags)
    return max(1, 5 - f) / 5.0


def _parse_ai_text(text: str, m: Dict[str, float], flags: List[str]):
    summary = []
    insights: List[str] = []
    recs: List[str] = []
    closing = ""

    section = None
    for raw in text.splitlines():
        line = raw.strip()
        low = line.lower()
        if low.startswith("summary"):
            section = "summary"; continue
        if low.startswith("key insights"):
            section = "insights"; continue
        if low.startswith("actionable recommendations"):
            section = "recs"; continue
        if low.startswith("closing") or low.startswith("motivation"):
            section = "closing"; continue
        if not line:
            continue
        if section == "summary":
            summary.append(line)
        elif section == "insights":
            insights.append(line.lstrip("-*0123456789. )").strip())
        elif section == "recs":
            recs.append(line.lstrip("-*0123456789. )").strip())
        elif section == "closing":
            closing = line

    if not summary:
        summary = [_default_summary(m)]
    if not insights:
        insights = _default_insights(m, flags)
    if len(recs) < 3:
        recs = _default_recommendations(m, flags)
    if not closing:
        closing = _default_closing()

    return " ".join(summary), insights, recs, closing


class InsightService:
    def __init__(self) -> None:
        self._analyzer = RuleAnalyzer()
        self._llm = LLMClient()

    def generate(self, payload: dict) -> dict:
        metrics, flags = self._analyzer.analyze(
            monthly_income=payload.get("monthlyIncome", 0) or 0.0,
            expenses_by_cat=payload.get("monthlyExpensesByCategory") or {},
            monthly_savings=payload.get("monthlySavings", 0) or 0.0,
            liabilities=payload.get("liabilities") or [],
            emergency_fund_balance=payload.get("emergencyFundBalance", 0) or 0.0,
        )

        prompt = build_prompt(payload, metrics, flags)

        if self._llm.available():
            text = self._llm.generate(prompt) or ""
            summary, insights, recs, closing = _parse_ai_text(text, metrics, flags)
        else:
            summary = _default_summary(metrics)
            expenses_by_cat = payload.get("monthlyExpensesByCategory") or {}
            insights = _default_insights(metrics, flags, expenses_by_cat, payload.get("expenseTrendPct"))
            recs = _default_recommendations(metrics, flags)
            closing = _default_closing()

        return {
            "summary": summary,
            "insights": insights,
            "recommendations": recs,
            "impactScore": _impact_score(flags),
            "closing": closing,
            "metrics": metrics,
            "flags": flags,
        }
