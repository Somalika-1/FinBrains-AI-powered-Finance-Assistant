package com.financeAssitant.FinBrains.service;

import com.financeAssitant.FinBrains.entity.Category;
import com.financeAssitant.FinBrains.repository.CategoryRepository;
import com.financeAssitant.FinBrains.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;
import java.time.LocalDateTime;
import java.time.YearMonth;

@Service
@RequiredArgsConstructor
public class CategoryService {

    private final CategoryRepository categoryRepository;
    private final ExpenseRepository expenseRepository;

    public List<Category> getAll(String userId) {
        // Seed defaults for this user if missing
        List<String> defaults = List.of("Food", "Travel", "Shopping");
        defaults.forEach(name -> {
            if (!categoryRepository.existsByUserIdAndNameIgnoreCase(userId, name)) {
                categoryRepository.save(Category.builder()
                        .userId(userId)
                        .name(name)
                        .isPredefined(true)
                        .build());
            }
        });
        // Ensure mandatory Monthly Income category exists
        if (!categoryRepository.existsByUserIdAndNameIgnoreCase(userId, "Monthly Income")) {
            categoryRepository.save(Category.builder()
                    .userId(userId)
                    .name("Monthly Income")
                    .isPredefined(true)
                    .build());
        }
        return categoryRepository.findByUserIdOrderByNameAsc(userId);
    }

    public Category create(String userId, String name, boolean isPredefined) {
        if (!StringUtils.hasText(name)) {
            throw new IllegalArgumentException("Category name is required");
        }
        if (categoryRepository.existsByUserIdAndNameIgnoreCase(userId, name.trim())) {
            throw new IllegalArgumentException("Category with the same name already exists");
        }
        Category category = Category.builder()
                .userId(userId)
                .name(name.trim())
                .isPredefined(isPredefined)
                .build();
        return categoryRepository.save(category);
    }

    public void delete(String userId, String id) {
        // Ensure category belongs to user
        Category cat = categoryRepository.findById(id)
                .orElseThrow(() -> new IllegalArgumentException("Category not found"));
        if (!userId.equals(cat.getUserId())) {
            throw new IllegalArgumentException("You cannot delete categories of another user");
        }
        if ("Monthly Income".equalsIgnoreCase(cat.getName())) {
            throw new IllegalArgumentException("'Monthly Income' category cannot be deleted");
        }
        // Determine current month window
        YearMonth ym = YearMonth.now();
        LocalDateTime start = ym.atDay(1).atStartOfDay();
        LocalDateTime end = ym.atEndOfMonth().atTime(23, 59, 59);

        // 1) Delete expenses in current month with this category
        expenseRepository.deleteByUserIdAndCategory_IdAndDateBetween(userId, id, start, end);

        // 2) For expenses outside current month, remove the category reference
        var allWithCategory = expenseRepository.findByUserIdAndCategory_Id(userId, id);
        allWithCategory.forEach(expense -> {
            LocalDateTime d = expense.getDate();
            boolean inCurrent = d != null && !d.isBefore(start) && !d.isAfter(end);
            if (!inCurrent && expense.getCategory() != null && id.equals(expense.getCategory().getId())) {
                expense.setCategory(null);
            }
        });
        expenseRepository.saveAll(allWithCategory);

        // Finally delete the category
        categoryRepository.deleteById(id);
    }
}
