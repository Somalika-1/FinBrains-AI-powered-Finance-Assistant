package com.financeAssitant.FinBrains.config;

import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

@Component
public class CategorySeeder implements ApplicationRunner {
    @Override
    public void run(ApplicationArguments args) {
        // No global seeding. Predefined categories are seeded per-user
        // on first GET /api/categories via CategoryService.getAll(userId).
    }
}
