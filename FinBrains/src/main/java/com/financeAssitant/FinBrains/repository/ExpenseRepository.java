package com.financeAssitant.FinBrains.repository;

import com.financeAssitant.FinBrains.entity.Expense;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.data.mongodb.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface ExpenseRepository extends MongoRepository<Expense, String> {

    // Basic queries
    List<Expense> findByUserIdOrderByDateDesc(String userId);
    Page<Expense> findByUserIdOrderByDateDesc(String userId, Pageable pageable);
    Optional<Expense> findByIdAndUserId(String id, String userId); // Security: user can only access their expenses

    // Date range queries
    List<Expense> findByUserIdAndDateBetweenOrderByDateDesc(String userId, LocalDateTime startDate, LocalDateTime endDate);
    Page<Expense> findByUserIdAndDateBetweenOrderByDateDesc(String userId, LocalDateTime startDate, LocalDateTime endDate, Pageable pageable);

    // Category queries (single embedded field category.id)
    List<Expense> findByUserIdAndCategory_IdOrderByDateDesc(String userId, String categoryId);
    Page<Expense> findByUserIdAndCategory_IdOrderByDateDesc(String userId, String categoryId, Pageable pageable);
    List<Expense> findByCategory_Id(String categoryId);
    List<Expense> findByUserIdAndCategory_Id(String userId, String categoryId);

    // Amount range queries
    List<Expense> findByUserIdAndAmountBetweenOrderByDateDesc(String userId, Double minAmount, Double maxAmount);

    // Payment method queries
    List<Expense> findByUserIdAndPaymentMethod_TypeOrderByDateDesc(String userId, String paymentType);

    // Search by description
    @Query("{'userId': ?0, 'description': {$regex: ?1, $options: 'i'}}")
    List<Expense> findByUserIdAndDescriptionContainingIgnoreCase(String userId, String searchTerm);

    // Complex filtering query
    @Query("{ 'userId': ?0, " +
            "$and: [" +
            "  { $or: [ { 'date': { $gte: ?1 } }, { ?1: null } ] }, " +
            "  { $or: [ { 'date': { $lte: ?2 } }, { ?2: null } ] }, " +
            "  { $or: [ { 'category.id': ?3 }, { ?3: null } ] }, " +
            "  { $or: [ { 'amount': { $gte: ?4 } }, { ?4: null } ] }, " +
            "  { $or: [ { 'amount': { $lte: ?5 } }, { ?5: null } ] }, " +
            "  { $or: [ { 'description': { $regex: ?6, $options: 'i' } }, { ?6: null } ] } " +
            "] }")
    Page<Expense> findByUserIdWithFilters(String userId, LocalDateTime startDate, LocalDateTime endDate,
                                          String categoryId, Double minAmount, Double maxAmount,
                                          String searchTerm, Pageable pageable);

    // Aggregation queries for analytics
    @Query(value = "{ 'userId': ?0, 'date': { $gte: ?1, $lte: ?2 } }",
            fields = "{ 'amount': 1, 'category': 1, 'date': 1 }")
    List<Expense> findExpenseSummaryByUserIdAndDateRange(String userId, LocalDateTime startDate, LocalDateTime endDate);

    // Monthly total
    @Query(value = "{ 'userId': ?0, 'date': { $gte: ?1, $lte: ?2 } }")
    List<Expense> findByUserIdAndCurrentMonth(String userId, LocalDateTime monthStart, LocalDateTime monthEnd);

    // Count queries
    long countByUserIdAndCategory_Id(String userId, String categoryId);

    // Delete queries
    void deleteByIdAndUserId(String id, String userId); // Security: user can only delete their expenses
    long deleteByUserIdAndDateBefore(String userId, LocalDateTime beforeDate); // Cleanup old expenses
    long deleteByUserIdAndCategory_IdAndDateBetween(String userId, String categoryId, LocalDateTime start, LocalDateTime end);

    // Recurring queries
    List<Expense> findByUserIdAndRecurring_IsRecurringTrue(String userId);
    List<Expense> findByRecurring_IsRecurringTrueAndRecurring_NextDueLessThanEqual(LocalDateTime dueBeforeOrEqual);
}
