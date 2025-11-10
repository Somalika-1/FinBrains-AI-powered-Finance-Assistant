package com.financeAssitant.FinBrains.repository;

import com.financeAssitant.FinBrains.entity.Category;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;
import java.util.List;

@Repository
public interface CategoryRepository extends MongoRepository<Category, String> {
    // User-scoped queries
    List<Category> findByUserIdOrderByNameAsc(String userId);
    Optional<Category> findByUserIdAndNameIgnoreCase(String userId, String name);
    boolean existsByUserIdAndNameIgnoreCase(String userId, String name);
}
