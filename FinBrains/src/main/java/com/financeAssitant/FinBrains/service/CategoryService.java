package com.financeAssitant.FinBrains.service;

import com.financeAssitant.FinBrains.entity.Category;
import com.financeAssitant.FinBrains.repository.CategoryRepository;
import com.financeAssitant.FinBrains.repository.ExpenseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.util.List;

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

        categoryRepository.deleteById(id);

        // Remove references from only this user's expenses (single category)
        var expenses = expenseRepository.findByUserIdAndCategory_Id(userId, id);
        expenses.forEach(expense -> {
            if (expense.getCategory() != null && id.equals(expense.getCategory().getId())) {
                expense.setCategory(null);
            }
        });
        expenseRepository.saveAll(expenses);
    }
}
