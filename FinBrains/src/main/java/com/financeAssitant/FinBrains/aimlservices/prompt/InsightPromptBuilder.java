package com.financeAssitant.FinBrains.aimlservices.prompt;

import com.financeAssitant.FinBrains.aimlservices.dto.FinancialInsightRequest;

import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.StringJoiner;

public class InsightPromptBuilder {

    public String buildPrompt(FinancialInsightRequest request,
                              Map<String, Object> metrics,
                              List<String> flags) {
        StringBuilder sb = new StringBuilder();
        sb.append("You are an AI-powered Personal Finance Analyst.\n");
        sb.append("Analyze the user's finances and produce: a short summary (2-3 lines), key insights (bulleted), 3-5 actionable recommendations, and a supportive closing line.\n");
        sb.append("Avoid legal/tax advice. Use simple, practical language and include numbers/percentages.\n\n");

        sb.append("User Financial Summary:\n");
        sb.append("- Monthly income: ").append(n(metrics.get("income"))).append("\n");
        sb.append("- Monthly savings: ").append(n(metrics.get("savings"))).append("\n");
        sb.append("- Total monthly expenses: ").append(n(metrics.get("totalExpenses"))).append("\n");
        if (request.getMonthlyExpensesByCategory() != null) {
            sb.append("- Expenses by category:\n");
            for (Map.Entry<String, Double> e : request.getMonthlyExpensesByCategory().entrySet()) {
                sb.append("  - ").append(e.getKey()).append(": ").append(n(e.getValue())).append("\n");
            }
        }
        if (request.getInvestments() != null && !request.getInvestments().isEmpty()) {
            sb.append("- Investments:\n");
            request.getInvestments().forEach(inv ->
                    sb.append("  - ").append(inv.getType()).append(": ").append(n(inv.getAmount())).append("\n")
            );
        }
        if (request.getLiabilities() != null && !request.getLiabilities().isEmpty()) {
            sb.append("- Liabilities (EMIs):\n");
            request.getLiabilities().forEach(li ->
                    sb.append("  - ").append(li.getName()).append(": ").append(n(li.getMonthlyEmi())).append("/mo\n")
            );
        }
        if (request.getGoals() != null) {
            StringJoiner st = new StringJoiner(", ");
            StringJoiner lt = new StringJoiner(", ");
            if (request.getGoals().getShortTerm() != null) request.getGoals().getShortTerm().forEach(st::add);
            if (request.getGoals().getLongTerm() != null) request.getGoals().getLongTerm().forEach(lt::add);
            sb.append("- Goals: short-term [").append(st.toString()).append("] long-term [").append(lt.toString()).append("]\n");
        }
        if (request.getEmergencyFundBalance() != null) {
            sb.append("- Emergency fund balance: ").append(n(request.getEmergencyFundBalance())).append("\n");
        }
        sb.append("\nComputed Metrics:\n");
        sb.append("- Savings rate %: ").append(n(metrics.get("savingsRatePct"))).append("\n");
        sb.append("- Expense ratio %: ").append(n(metrics.get("expenseRatioPct"))).append("\n");
        sb.append("- Debt-to-income %: ").append(n(metrics.get("debtToIncomePct"))).append("\n");
        sb.append("- Emergency fund coverage (months): ").append(n(metrics.get("emergencyFundMonths"))).append("\n");
        sb.append("- Lifestyle spending % of expenses: ").append(n(metrics.get("lifestyleSpendingPctOfExpenses"))).append("\n");

        sb.append("\nRisk/Opportunity Flags:\n");
        if (flags != null && !flags.isEmpty()) {
            for (String f : flags) sb.append("- ").append(f).append("\n");
        } else {
            sb.append("- None critical detected\n");
        }

        sb.append("\nInstructions: Based on the above, generate:\n");
        sb.append("- Summary (2-3 lines)\n");
        sb.append("- Key Insights (5 bullets max)\n");
        sb.append("- 3-5 Actionable Recommendations (numbered)\n");
        sb.append("- Motivational closing line.\n");
        sb.append("Tone: supportive, non-judgmental, practical.\n");
        sb.append("Avoid legal/tax advice. Include numeric specifics where possible.\n");

        return sb.toString();
    }

    private String n(Object v) {
        if (v == null) return "0";
        if (v instanceof Number) return String.format(Locale.US, "%.2f", ((Number) v).doubleValue());
        return String.valueOf(v);
    }
}
