package com.financeAssitant.FinBrains.service;

import com.financeAssitant.FinBrains.entity.Budget;
import com.financeAssitant.FinBrains.repository.BudgetRepository;
import com.financeAssitant.FinBrains.repository.ExpenseRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class BudgetService {

    @Autowired
    private BudgetRepository budgetRepository;

    @Autowired
    private ExpenseRepository expenseRepository;

    public Budget setOrUpdateBudget(String userId, Double amount, YearMonth ym) {
        String monthKey = ym.toString(); // YYYY-MM
        Budget budget = budgetRepository.findByUserIdAndMonth(userId, monthKey)
                .orElse(Budget.builder().userId(userId).month(monthKey).build());
        budget.setAmount(amount);
        return budgetRepository.save(budget);
    }

    public Budget getCurrentBudget(String userId) {
        YearMonth ym = YearMonth.now();
        return budgetRepository.findByUserIdAndMonth(userId, ym.toString()).orElse(null);
    }

    public Map<String, Object> getStatus(String userId, YearMonth ym) {
        String monthKey = ym.toString();
        Budget budget = budgetRepository.findByUserIdAndMonth(userId, monthKey).orElse(null);

        LocalDate start = ym.atDay(1);
        LocalDate endDay = ym.atEndOfMonth();
        LocalDateTime startDt = start.atStartOfDay();
        LocalDateTime endDt = endDay.atTime(23,59,59);

        List<com.financeAssitant.FinBrains.entity.Expense> exps = expenseRepository.findByUserIdAndCurrentMonth(userId, startDt, endDt);
        double spent = exps.stream().mapToDouble(e -> e.getAmount() != null ? e.getAmount() : 0.0).sum();
        double budgetAmt = budget != null && budget.getAmount() != null ? budget.getAmount() : 0.0;
        double remaining = budgetAmt - spent;
        double percentage = budgetAmt > 0 ? (spent / budgetAmt) * 100.0 : 0.0;

        Map<String, Object> map = new HashMap<>();
        map.put("month", ym.getMonth().name().substring(0,1) + ym.getMonth().name().substring(1).toLowerCase() + " " + ym.getYear());
        map.put("monthKey", monthKey);
        map.put("budget", budgetAmt);
        map.put("spent", spent);
        map.put("remaining", remaining);
        map.put("percentage", (int)Math.round(percentage));
        map.put("exceeded", budgetAmt > 0 && spent > budgetAmt);
        return map;
    }

    public List<Map<String, Object>> getHistory(String userId, YearMonth from, YearMonth to) {
        List<Map<String, Object>> list = new ArrayList<>();
        YearMonth cur = from;
        while (!cur.isAfter(to)) {
            list.add(getStatus(userId, cur));
            cur = cur.plusMonths(1);
        }
        return list;
    }

    public Map<String, Object> getCategoryBreakdown(String userId, YearMonth ym) {
        LocalDateTime startDt = ym.atDay(1).atStartOfDay();
        LocalDateTime endDt = ym.atEndOfMonth().atTime(23,59,59);
        List<com.financeAssitant.FinBrains.entity.Expense> exps = expenseRepository.findByUserIdAndCurrentMonth(userId, startDt, endDt);
        Map<String, Double> byCat = new HashMap<>();
        double total = 0.0;
        for (var e : exps) {
            String name = e.getCategory() != null ? (e.getCategory().getName() != null ? e.getCategory().getName() : "Uncategorized") : "Uncategorized";
            double amt = e.getAmount() != null ? e.getAmount() : 0.0;
            byCat.put(name, byCat.getOrDefault(name, 0.0) + amt);
            total += amt;
        }
        List<Map<String,Object>> items = new ArrayList<>();
        for (var entry : byCat.entrySet()) {
            Map<String,Object> row = new HashMap<>();
            row.put("name", entry.getKey());
            row.put("amount", entry.getValue());
            row.put("percent", total > 0 ? (entry.getValue() / total) * 100.0 : 0.0);
            items.add(row);
        }
        Map<String, Object> out = new HashMap<>();
        out.put("total", total);
        out.put("items", items);
        return out;
    }
}
