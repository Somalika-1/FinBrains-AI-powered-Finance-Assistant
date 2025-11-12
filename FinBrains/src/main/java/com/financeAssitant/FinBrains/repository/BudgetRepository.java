package com.financeAssitant.FinBrains.repository;

import com.financeAssitant.FinBrains.entity.Budget;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface BudgetRepository extends MongoRepository<Budget, String> {
    Optional<Budget> findByUserIdAndMonth(String userId, String month);
}
