package com.financeAssitant.FinBrains.aimlservices.logic;

import com.financeAssitant.FinBrains.aimlservices.dto.FinancialInsightRequest;

import java.util.*;

public class FinancialRuleAnalyzer {

    public static class Result {
        public final Map<String, Object> metrics;
        public final List<String> flags;

        public Result(Map<String, Object> metrics, List<String> flags) {
            this.metrics = metrics;
            this.flags = flags;
        }
    }

    public Result analyze(FinancialInsightRequest req) {
        double income = safe(req.getMonthlyIncome());
        Map<String, Double> expensesMap = Optional.ofNullable(req.getMonthlyExpensesByCategory()).orElseGet(HashMap::new);
        double totalExpenses = expensesMap.values().stream().filter(Objects::nonNull).mapToDouble(Double::doubleValue).sum();
        double savings = safe(req.getMonthlySavings());

        double savingsRate = income > 0 ? round2((savings / income) * 100.0) : 0.0;
        double expenseRatio = income > 0 ? round2((totalExpenses / income) * 100.0) : 0.0;
        double totalEmi = Optional.ofNullable(req.getLiabilities()).orElse(List.of())
                .stream().map(l -> safe(l.getMonthlyEmi())).mapToDouble(Double::doubleValue).sum();
        double dti = income > 0 ? round2((totalEmi / income) * 100.0) : 0.0;

        double emergencyFund = safe(req.getEmergencyFundBalance());
        double monthlyBurn = totalExpenses > 0 ? totalExpenses : Math.max(1.0, income * 0.5); // fallback if not provided
        double emergencyMonths = round2(emergencyFund / (monthlyBurn > 0 ? monthlyBurn : 1.0));

        // Lifestyle spending heuristic
        double lifestyle = sumCategories(expensesMap, Set.of("Shopping", "Entertainment", "Dining", "Food", "Subscriptions"));
        double lifestylePct = totalExpenses > 0 ? round2((lifestyle / totalExpenses) * 100.0) : 0.0;

        Map<String, Object> metrics = new LinkedHashMap<>();
        metrics.put("income", income);
        metrics.put("totalExpenses", totalExpenses);
        metrics.put("savings", savings);
        metrics.put("savingsRatePct", savingsRate);
        metrics.put("expenseRatioPct", expenseRatio);
        metrics.put("debtToIncomePct", dti);
        metrics.put("emergencyFundMonths", emergencyMonths);
        metrics.put("lifestyleSpendingPctOfExpenses", lifestylePct);
        metrics.put("totalEmi", totalEmi);

        List<String> flags = new ArrayList<>();
        if (savingsRate < 20.0) flags.add("Low savings rate (< 20%)");
        if (dti > 40.0) flags.add("High debt-to-income ratio (> 40%)");
        if (emergencyMonths < 3.0) flags.add("Insufficient emergency fund (< 3 months)");
        if (lifestylePct > 30.0) flags.add("High lifestyle spending (> 30% of expenses)");

        return new Result(metrics, flags);
    }

    private double safe(Double v) { return v == null ? 0.0 : v; }

    private double sumCategories(Map<String, Double> m, Set<String> names) {
        double s = 0.0;
        for (Map.Entry<String, Double> e : m.entrySet()) {
            if (e.getKey() == null) continue;
            if (names.contains(e.getKey())) s += safe(e.getValue());
        }
        return s;
    }

    private double round2(double v) { return Math.round(v * 100.0) / 100.0; }
}
