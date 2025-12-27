from __future__ import annotations
from typing import Dict, List

def build_prompt(payload: dict, metrics: Dict[str, float], flags: List[str]) -> str:
    lines = []
    lines.append("You are an AI-powered Personal Finance Analyst.")
    lines.append("Analyze the user's finances and produce: a short summary (2-3 lines), key insights (bulleted), 2-3 actionable recommendations, and a supportive closing line.")
    lines.append("Only use: monthly income, monthly expenses, savings (income - expenses), savings rate (%), top expense categories, and expense trend vs last month if available. Avoid legal/tax advice. Keep it short and practical.\n")

    lines.append("User Financial Summary:")
    lines.append(f"- Monthly income: {metrics.get('income', 0):.2f}")
    lines.append(f"- Monthly savings (income - expenses): {metrics.get('savings', 0):.2f}")
    lines.append(f"- Total monthly expenses: {metrics.get('totalExpenses', 0):.2f}")

    expenses = (payload or {}).get("monthlyExpensesByCategory") or {}
    if expenses:
        lines.append("- Expenses by category:")
        for k, v in expenses.items():
            lines.append(f"  - {k}: {float(v):.2f}")

    lines.append("\nComputed Metrics:")
    lines.append(f"- Savings rate %: {metrics.get('savingsRatePct', 0):.2f}")

    lines.append("\nRisk/Opportunity Flags:")
    if flags:
        for f in flags:
            lines.append(f"- {f}")
    else:
        lines.append("- None")

    lines.append("\nInstructions: Based on the above, generate:")
    lines.append("- Summary (2-3 lines)")
    lines.append("- Key Insights (max 5 bullets)")
    lines.append("- 2-3 Actionable Recommendations (numbered)")
    lines.append("- Motivational closing line")
    lines.append("Tone: supportive, non-judgmental, practical. Include numeric specifics only from provided data. If income is 0, avoid ratios and suggest adding income entries.")

    return "\n".join(lines)
