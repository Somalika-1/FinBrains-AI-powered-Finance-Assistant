package com.financeAssitant.FinBrains.service;

import com.financeAssitant.FinBrains.entity.Expense;
import com.financeAssitant.FinBrains.repository.ExpenseRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
public class RecurringExpenseService {

    private final ExpenseRepository expenseRepository;

    public RecurringExpenseService(ExpenseRepository expenseRepository) {
        this.expenseRepository = expenseRepository;
    }

    // Runs every day at 02:15 AM server time
    @Scheduled(cron = "0 15 2 * * *")
    public void processDueRecurringExpenses() {
        List<Expense> due = expenseRepository
                .findByRecurring_IsRecurringTrueAndRecurring_NextDueLessThanEqual(LocalDateTime.now());
        if (due == null || due.isEmpty()) return;

        List<Expense> toInsert = new ArrayList<>();
        for (Expense template : due) {
            if (template.getRecurring() == null || template.getRecurring().getNextDue() == null) continue;

            // Respect endDate: skip and disable if beyond end
            if (template.getRecurring().getEndDate() != null) {
                LocalDateTime endAt = template.getRecurring().getEndDate().atStartOfDay();
                if (template.getRecurring().getNextDue().isAfter(endAt)) {
                    template.getRecurring().setIsRecurring(false);
                    template.getRecurring().setNextDue(null);
                    continue;
                }
            }

            // Create a new expense record for the scheduled date
            Expense newExp = Expense.builder()
                    .userId(template.getUserId())
                    .amount(template.getAmount())
                    .description(template.getDescription())
                    .category(template.getCategory())
                    .subcategory(template.getSubcategory())
                    .date(template.getRecurring().getNextDue())
                    .paymentMethod(template.getPaymentMethod())
                    .tags(template.getTags())
                    .recurring(Expense.Recurring.builder()
                            .isRecurring(false)
                            .frequency(template.getRecurring().getFrequency())
                            .startDate(template.getRecurring().getStartDate())
                            .endDate(template.getRecurring().getEndDate())
                            .nextDue(null)
                            .build())
                    .metadata(new Expense.Metadata())
                    .build();
            toInsert.add(newExp);

            // Bump nextDue for the template (do not disable recurring)
            if (template.getRecurring() != null) {
                String freq = template.getRecurring().getFrequency();
                LocalDateTime current = template.getRecurring().getNextDue();
                LocalDateTime next = computeNext(current, freq);
                // Stop if exceeds endDate
                if (template.getRecurring().getEndDate() != null) {
                    LocalDateTime endAt = template.getRecurring().getEndDate().atStartOfDay();
                    if (next.isAfter(endAt)) {
                        template.getRecurring().setIsRecurring(false);
                        template.getRecurring().setNextDue(null);
                    } else {
                        template.getRecurring().setNextDue(next);
                    }
                } else {
                    template.getRecurring().setNextDue(next);
                }
            }
        }

        if (!toInsert.isEmpty()) expenseRepository.saveAll(toInsert);
        expenseRepository.saveAll(due); // persist nextDue updates
    }

    private LocalDateTime computeNext(LocalDateTime from, String freq) {
        if (from == null) from = LocalDateTime.now();
        String f = freq != null ? freq.trim().toUpperCase() : "MONTHLY";
        switch (f) {
            case "DAILY": return from.plusDays(1);
            case "WEEKLY": return from.plusWeeks(1);
            case "MONTHLY": return from.plusMonths(1);
            case "QUARTERLY": return from.plusMonths(3);
            case "YEARLY": return from.plusYears(1);
            case "CUSTOM":
            default: return from.plusMonths(1);
        }
    }
}
