package com.financeAssitant.FinBrains.service;

import com.financeAssitant.FinBrains.dto.CreateExpenseRequest;
import com.financeAssitant.FinBrains.dto.ExpenseFilterRequest;
import com.financeAssitant.FinBrains.dto.ExpenseResponse;
import com.financeAssitant.FinBrains.dto.UpdateExpenseRequest;
import com.financeAssitant.FinBrains.entity.Expense;
import com.financeAssitant.FinBrains.repository.ExpenseRepository;
import com.financeAssitant.FinBrains.repository.CategoryRepository;
import com.financeAssitant.FinBrains.entity.Category;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import java.util.stream.Collectors;

@Service
public class ExpenseService {

    @Autowired
    private ExpenseRepository expenseRepository;

    @Autowired
    private CategoryRepository categoryRepository;

    private String normalizeFrequency(String freq) {
        if (freq == null) return null;
        String f = freq.trim().toUpperCase();
        return switch (f) {
            case "DAILY", "DAY" -> "DAILY";
            case "WEEKLY", "WEEK" -> "WEEKLY";
            case "MONTHLY", "MONTH" -> "MONTHLY";
            case "QUARTERLY", "QUARTER" -> "QUARTERLY";
            case "YEARLY", "YEAR" -> "YEARLY";
            case "CUSTOM" -> "CUSTOM";
            default -> f;
        };
    }

    private LocalDateTime addPeriod(LocalDateTime from, String freq) {
        LocalDateTime base = from != null ? from : LocalDateTime.now();
        String f = normalizeFrequency(freq);
        if ("DAILY".equalsIgnoreCase(f)) return base.plusDays(1);
        if ("WEEKLY".equalsIgnoreCase(f)) return base.plusWeeks(1);
        if ("MONTHLY".equalsIgnoreCase(f)) return base.plusMonths(1);
        if ("QUARTERLY".equalsIgnoreCase(f)) return base.plusMonths(3);
        if ("YEARLY".equalsIgnoreCase(f)) return base.plusYears(1);
        return base.plusMonths(1);
    }

    private LocalDateTime computeNextOnOrAfter(LocalDateTime start, String freq, LocalDateTime minInclusive) {
        LocalDateTime candidate = (start != null ? start : LocalDateTime.now());
        LocalDateTime min = (minInclusive != null ? minInclusive : LocalDateTime.now());
        while (candidate.isBefore(min)) {
            candidate = addPeriod(candidate, freq);
        }
        return candidate;
    }

    public ExpenseResponse createExpense(String userId, CreateExpenseRequest request) {
        // Resolve single categoryId to Category (DBRef)
        Category categoryEntity = null;
        if (request.getCategoryId() != null && !request.getCategoryId().isBlank()) {
            Category category = categoryRepository.findById(request.getCategoryId())
                    .orElseThrow(() -> new IllegalArgumentException("Invalid category ID"));
            boolean isGlobal = category.getUserId() == null || category.isPredefined();
            boolean isOwnedByUser = userId.equals(category.getUserId());
            if (!isGlobal && !isOwnedByUser) {
                throw new IllegalArgumentException("Category does not belong to the current user");
            }
            categoryEntity = category;
        }

        // Normalize type (default EXPENSE). Amount must always be positive.
        Expense.ExpenseType type = Expense.ExpenseType.EXPENSE;
        if (request.getType() != null && !request.getType().isBlank()) {
            String t = request.getType().trim().toUpperCase();
            if ("EXPENSE".equals(t)) type = Expense.ExpenseType.EXPENSE; else if ("INCOME".equals(t)) type = Expense.ExpenseType.INCOME; else throw new IllegalArgumentException("Invalid type. Must be EXPENSE or INCOME");
        }

        // If INCOME, ensure category is 'Monthly Income' (auto-assign if not provided or mismatched)
        if (type == Expense.ExpenseType.INCOME) {
            Category monthlyIncomeCat = categoryRepository.findByUserIdAndNameIgnoreCase(userId, "Monthly Income")
                    .orElseThrow(() -> new IllegalArgumentException("Mandatory category 'Monthly Income' not found"));
            if (categoryEntity == null || categoryEntity.getName() == null || !"Monthly Income".equalsIgnoreCase(categoryEntity.getName())) {
                categoryEntity = monthlyIncomeCat;
            }
        } else {
            // For EXPENSE, disallow 'Monthly Income' category
            if (categoryEntity != null && categoryEntity.getName() != null && "Monthly Income".equalsIgnoreCase(categoryEntity.getName())) {
                throw new IllegalArgumentException("'Monthly Income' category can only be used with INCOME type");
            }
        }

        // Build expense entity
        Expense expense = Expense.builder()
                .userId(userId)
                .amount(request.getAmount())
                .description(request.getDescription())
                .date(request.getDate() != null ? request.getDate() : LocalDateTime.now())
                .subcategory(request.getSubcategory())
                .tags(request.getTags())
                .category(categoryEntity)
                .type(type)
                .paymentMethod(Expense.PaymentMethod.builder()
                        .type(request.getPaymentType() != null ? request.getPaymentType() : "cash")
                        .provider(request.getPaymentProvider())
                        .lastFourDigits(request.getLastFourDigits())
                        .build())
                .recurring(Expense.Recurring.builder()
                        .isRecurring(request.getIsRecurring() != null ? request.getIsRecurring() : false)
                        .frequency(normalizeFrequency(request.getRecurringFrequency()))
                        .startDate(request.getStartDate())
                        .endDate(request.getEndDate())
                        .build())
                .metadata(Expense.Metadata.builder()
                        .createdAt(LocalDateTime.now())
                        .updatedAt(LocalDateTime.now())
                        .createdBy("user")
                        .source("manual")
                        .version(1)
                        .build())
                .build();

        // Validate recurring consistency and compute nextDue using startDate/endDate
        if (expense.getRecurring() != null) {
            boolean rec = expense.getRecurring().getIsRecurring() != null && expense.getRecurring().getIsRecurring();
            String freq = expense.getRecurring().getFrequency();
            if (!rec && freq != null && !freq.isBlank()) {
                throw new IllegalArgumentException("Recurring interval provided but recurring=false");
            }
            if (rec) {
                if (freq == null || freq.isBlank()) {
                    throw new IllegalArgumentException("Recurring interval is required when recurring=true");
                }
                // Determine initial candidate from startDate (as first occurrence) or from expense.date
                LocalDateTime startAt = (expense.getRecurring().getStartDate() != null)
                        ? expense.getRecurring().getStartDate().atStartOfDay()
                        : (expense.getDate() != null ? expense.getDate() : LocalDateTime.now());
                LocalDateTime todayStart = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
                LocalDateTime next = computeNextOnOrAfter(startAt, freq, todayStart);
                // If endDate is set and next is after endDate (inclusive end), stop scheduling
                if (expense.getRecurring().getEndDate() != null) {
                    LocalDateTime endAt = expense.getRecurring().getEndDate().atStartOfDay();
                    if (next.isAfter(endAt)) {
                        // effectively disable further runs
                        expense.getRecurring().setIsRecurring(false);
                        next = null;
                    }
                }
                expense.getRecurring().setNextDue(next);
            }
        }

        // Save expense
        Expense saved = expenseRepository.save(expense);
        return convertToResponse(saved);
    }

    public ExpenseResponse updateExpense(String userId, String expenseId, UpdateExpenseRequest request) {
        Optional<Expense> expenseOptional = expenseRepository.findByIdAndUserId(expenseId, userId);

        if (expenseOptional.isEmpty()) {
            throw new RuntimeException("Expense not found or access denied!");
        }

        Expense expense = expenseOptional.get();

        // Update fields only if provided
        if (request.getAmount() != null) {
            expense.setAmount(request.getAmount());
        }
        if (request.getDescription() != null) {
            expense.setDescription(request.getDescription());
        }
        // Update type if provided (EXPENSE or INCOME)
        try {
            var t = (request.getType() != null ? request.getType().trim() : null);
            if (t != null && !t.isEmpty()) {
                String up = t.toUpperCase();
                if ("EXPENSE".equals(up)) expense.setType(Expense.ExpenseType.EXPENSE);
                else if ("INCOME".equals(up)) {
                    expense.setType(Expense.ExpenseType.INCOME);
                    // Force category to 'Monthly Income' when type is INCOME
                    Category monthlyIncomeCat = categoryRepository.findByUserIdAndNameIgnoreCase(userId, "Monthly Income")
                            .orElseThrow(() -> new IllegalArgumentException("Mandatory category 'Monthly Income' not found"));
                    expense.setCategory(monthlyIncomeCat);
                }
                else throw new IllegalArgumentException("Invalid type. Must be EXPENSE or INCOME");
            }
        } catch (NoSuchMethodError | Exception ignore) {
            // Will compile once UpdateExpenseRequest has a 'type' field; ignore at runtime otherwise
        }
        if (request.getDate() != null) {
            expense.setDate(request.getDate());
        }
        if (request.getCategoryId() != null) {
            if (request.getCategoryId().isBlank()) {
                expense.setCategory(null);
            } else {
                Category category = categoryRepository.findById(request.getCategoryId())
                        .orElseThrow(() -> new IllegalArgumentException("Invalid category ID"));
                boolean isGlobal = category.getUserId() == null || category.isPredefined();
                boolean isOwnedByUser = userId.equals(category.getUserId());
                if (!isGlobal && !isOwnedByUser) {
                    throw new IllegalArgumentException("Category does not belong to the current user");
                }
                // If current type is INCOME, force 'Monthly Income' category regardless of provided id
                if (expense.getType() == Expense.ExpenseType.INCOME) {
                    Category monthlyIncomeCat = categoryRepository.findByUserIdAndNameIgnoreCase(userId, "Monthly Income")
                            .orElseThrow(() -> new IllegalArgumentException("Mandatory category 'Monthly Income' not found"));
                    expense.setCategory(monthlyIncomeCat);
                } else {
                    if (category.getName() != null && "Monthly Income".equalsIgnoreCase(category.getName())) {
                        throw new IllegalArgumentException("'Monthly Income' category can only be used with INCOME type");
                    }
                    expense.setCategory(category);
                }
            }
        }
        if (request.getSubcategory() != null) {
            expense.setSubcategory(request.getSubcategory());
        }
        if (request.getTags() != null) {
            expense.setTags(request.getTags());
        }

        // Update payment method
        if (request.getPaymentType() != null || request.getPaymentProvider() != null) {
            Expense.PaymentMethod pm = expense.getPaymentMethod() != null ? expense.getPaymentMethod() : new Expense.PaymentMethod();
            if (request.getPaymentType() != null) pm.setType(request.getPaymentType());
            if (request.getPaymentProvider() != null) pm.setProvider(request.getPaymentProvider());
            if (request.getLastFourDigits() != null) pm.setLastFourDigits(request.getLastFourDigits());
            expense.setPaymentMethod(pm);
        }

        // Update recurring config
        if (request.getIsRecurring() != null || request.getRecurringFrequency() != null || request.getStartDate() != null || request.getEndDate() != null) {
            Expense.Recurring r = expense.getRecurring() != null ? expense.getRecurring() : new Expense.Recurring();
            if (request.getIsRecurring() != null) r.setIsRecurring(request.getIsRecurring());
            if (request.getRecurringFrequency() != null) r.setFrequency(normalizeFrequency(request.getRecurringFrequency()));
            if (request.getStartDate() != null) r.setStartDate(request.getStartDate());
            if (request.getEndDate() != null) r.setEndDate(request.getEndDate());

            boolean rec = r.getIsRecurring() != null && r.getIsRecurring();
            if (!rec && r.getFrequency() != null && !r.getFrequency().isBlank()) {
                throw new IllegalArgumentException("Recurring interval provided but recurring=false");
            }

            if (rec) {
                if (r.getFrequency() == null || r.getFrequency().isBlank()) {
                    throw new IllegalArgumentException("Recurring interval is required when recurring=true");
                }
                // Recompute nextDue if startDate/frequency/isRecurring changed or if nextDue is null
                LocalDateTime startAt = (r.getStartDate() != null)
                        ? r.getStartDate().atStartOfDay()
                        : (expense.getDate() != null ? expense.getDate() : LocalDateTime.now());
                LocalDateTime todayStart = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
                LocalDateTime next = computeNextOnOrAfter(startAt, r.getFrequency(), todayStart);
                if (r.getEndDate() != null) {
                    LocalDateTime endAt = r.getEndDate().atStartOfDay();
                    if (next.isAfter(endAt)) {
                        r.setIsRecurring(false);
                        next = null;
                    }
                }
                r.setNextDue(next);
            } else {
                // Turning recurring off clears nextDue
                r.setNextDue(null);
            }
            expense.setRecurring(r);
        }

        // Update metadata
        expense.getMetadata().setUpdatedAt(LocalDateTime.now());
        expense.getMetadata().setVersion(expense.getMetadata().getVersion() + 1);

        Expense savedExpense = expenseRepository.save(expense);
        return convertToResponse(savedExpense);
    }

    public ExpenseResponse getExpenseById(String userId, String expenseId) {
        Optional<Expense> expenseOptional = expenseRepository.findByIdAndUserId(expenseId, userId);

        if (expenseOptional.isEmpty()) {
            throw new RuntimeException("Expense not found or access denied!");
        }

        return convertToResponse(expenseOptional.get());
    }

    public List<ExpenseResponse> getUserExpenses(String userId) {
        List<Expense> expenses = expenseRepository.findByUserIdOrderByDateDesc(userId);
        return expenses.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public void deleteExpense(String userId, String expenseId) {
        Optional<Expense> expenseOptional = expenseRepository.findByIdAndUserId(expenseId, userId);

        if (expenseOptional.isEmpty()) {
            throw new RuntimeException("Expense not found or access denied!");
        }

        expenseRepository.deleteByIdAndUserId(expenseId, userId);
    }

    public List<ExpenseResponse> getExpensesByCategory(String userId, String categoryId) {
        List<Expense> expenses = expenseRepository.findByUserIdAndCategory_IdOrderByDateDesc(userId, categoryId);
        return expenses.stream()
                .map(this::convertToResponse)
                .collect(Collectors.toList());
    }

    public Page<ExpenseResponse> getUserExpensesPaginated(String userId, int page, int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "date"));
        Page<Expense> expensePage = expenseRepository.findByUserIdOrderByDateDesc(userId, pageable);

        return expensePage.map(this::convertToResponse);
    }

    public Page<ExpenseResponse> getFilteredExpenses(String userId, ExpenseFilterRequest filterRequest) {
        Sort sort = Sort.by(
                "desc".equalsIgnoreCase(filterRequest.getSortDirection()) ?
                        Sort.Direction.DESC : Sort.Direction.ASC,
                filterRequest.getSortBy()
        );

        Pageable pageable = PageRequest.of(
                filterRequest.getPage(),
                filterRequest.getSize(),
                sort
        );

        Page<Expense> expensePage = expenseRepository.findByUserIdWithFilters(
                userId,
                filterRequest.getStartDate(),
                filterRequest.getEndDate(),
                filterRequest.getCategoryId(),
                filterRequest.getMinAmount(),
                filterRequest.getMaxAmount(),
                filterRequest.getSearchTerm(),
                pageable
        );

        return expensePage.map(this::convertToResponse);
    }


    private ExpenseResponse convertToResponse(Expense expense) {
        return ExpenseResponse.builder()
                .id(expense.getId())
                .amount(expense.getAmount())
                .description(expense.getDescription())
                .type(expense.getType() != null ? expense.getType().name() : "EXPENSE")
                .subcategory(expense.getSubcategory())
                .date(expense.getDate())
                .tags(expense.getTags())
                .isRecurring(expense.getRecurring() != null ? expense.getRecurring().getIsRecurring() : false)
                .recurringFrequency(expense.getRecurring() != null ? expense.getRecurring().getFrequency() : null)
                .nextRunDate(expense.getRecurring() != null ? expense.getRecurring().getNextDue() : null)
                .startDate(expense.getRecurring() != null ? expense.getRecurring().getStartDate() : null)
                .endDate(expense.getRecurring() != null ? expense.getRecurring().getEndDate() : null)
                .createdAt(expense.getMetadata() != null ? expense.getMetadata().getCreatedAt() : null)
                .updatedAt(expense.getMetadata() != null ? expense.getMetadata().getUpdatedAt() : null)
                .category(expense.getCategory() != null ?
                        ExpenseResponse.CategoryResponse.builder()
                                .id(expense.getCategory().getId())
                                .name(expense.getCategory().getName())
                                .build() : null)
                .paymentMethod(expense.getPaymentMethod() != null ?
                        ExpenseResponse.PaymentMethodResponse.builder()
                                .type(expense.getPaymentMethod().getType())
                                .provider(expense.getPaymentMethod().getProvider())
                                .lastFourDigits(expense.getPaymentMethod().getLastFourDigits())
                                .build() : null)
                .build();
    }

    public double getMonthlyIncome(String userId, java.time.YearMonth ym) {
        java.time.LocalDateTime startDt = ym.atDay(1).atStartOfDay();
        java.time.LocalDateTime endDt = ym.atEndOfMonth().atTime(23, 59, 59);
        List<Expense> list = expenseRepository.findByUserIdAndCurrentMonth(userId, startDt, endDt);
        double sum = 0.0;
        for (var e : list) {
            if (e.getCategory() != null && e.getCategory().getName() != null) {
                String nm = e.getCategory().getName();
                String norm = nm.toLowerCase().replaceAll("[^a-z]", ""); // strip spaces/punct
                if (norm.contains("monthlyincome")) {
                    sum += (e.getAmount() != null ? e.getAmount() : 0.0);
                }
            }
        }
        return sum;
    }

    public double getMonthlySpent(String userId, java.time.YearMonth ym) {
        java.time.LocalDateTime startDt = ym.atDay(1).atStartOfDay();
        java.time.LocalDateTime endDt = ym.atEndOfMonth().atTime(23, 59, 59);
        List<Expense> list = expenseRepository.findByUserIdAndCurrentMonth(userId, startDt, endDt);
        double sum = 0.0;
        for (var e : list) {
            if (e.getAmount() == null) continue;
            String nm = e.getCategory() != null && e.getCategory().getName() != null ? e.getCategory().getName() : "";
            String norm = nm.toLowerCase().replaceAll("[^a-z]", "");
            if (!norm.contains("monthlyincome")) {
                sum += e.getAmount();
            }
        }
        return sum;
    }

    public double getBalance(String userId) {
        List<Expense> list = expenseRepository.findByUserIdOrderByDateDesc(userId);
        double income = 0.0, expense = 0.0;
        for (var e : list) {
            double amt = e.getAmount() != null ? e.getAmount() : 0.0;
            Expense.ExpenseType t = e.getType() != null ? e.getType() : Expense.ExpenseType.EXPENSE;
            if (t == Expense.ExpenseType.INCOME) income += amt; else expense += amt;
        }
        return income - expense;
    }

    public List<ExpenseResponse> getRecurringExpenses(String userId) {
        return expenseRepository.findByUserIdAndRecurring_IsRecurringTrue(userId)
                .stream().map(this::convertToResponse).collect(Collectors.toList());
    }

    public ExpenseResponse updateRecurring(String userId, String expenseId, Boolean isRecurring, String interval) {
        Expense expense = expenseRepository.findByIdAndUserId(expenseId, userId)
                .orElseThrow(() -> new RuntimeException("Expense not found or access denied!"));
        Expense.Recurring r = expense.getRecurring() != null ? expense.getRecurring() : new Expense.Recurring();
        if (isRecurring != null) r.setIsRecurring(isRecurring);
        if (interval != null) r.setFrequency(normalizeFrequency(interval));
        boolean rec = r.getIsRecurring() != null && r.getIsRecurring();
        if (!rec && r.getFrequency() != null && !r.getFrequency().isBlank()) {
            throw new IllegalArgumentException("Recurring interval provided but recurring=false");
        }
        if (rec) {
            if (r.getFrequency() == null || r.getFrequency().isBlank()) {
                throw new IllegalArgumentException("Recurring interval is required when recurring=true");
            }
            LocalDateTime todayStart = LocalDateTime.now().withHour(0).withMinute(0).withSecond(0).withNano(0);
            LocalDateTime startAt = (r.getStartDate() != null)
                    ? r.getStartDate().atStartOfDay()
                    : todayStart;
            LocalDateTime next = computeNextOnOrAfter(startAt, r.getFrequency(), todayStart);
            if (r.getEndDate() != null) {
                LocalDateTime endAt = r.getEndDate().atStartOfDay();
                if (next.isAfter(endAt)) {
                    r.setIsRecurring(false);
                    next = null;
                }
            }
            r.setNextDue(next);
        } else {
            r.setNextDue(null);
        }
        expense.setRecurring(r);
        expense.getMetadata().setUpdatedAt(LocalDateTime.now());
        Expense saved = expenseRepository.save(expense);
        return convertToResponse(saved);
    }
}

