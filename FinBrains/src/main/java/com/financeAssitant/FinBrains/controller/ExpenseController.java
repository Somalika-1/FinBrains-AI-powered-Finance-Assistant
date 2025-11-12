package com.financeAssitant.FinBrains.controller;

import com.financeAssitant.FinBrains.dto.CreateExpenseRequest;
import com.financeAssitant.FinBrains.dto.ExpenseResponse;
import com.financeAssitant.FinBrains.dto.UpdateExpenseRequest;
import com.financeAssitant.FinBrains.service.ExpenseService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/expenses")
@CrossOrigin(origins = "http://localhost:5173")
public class ExpenseController {

    @Autowired
    private ExpenseService expenseService;

    // Create new expense
    @PostMapping
    public ResponseEntity<?> createExpense(@RequestHeader(value = "User-ID", required = false) String userIdHeader,
                                           @Valid @RequestBody CreateExpenseRequest request) {
        try {
            // Get user ID from security context instead of header
            String userId = resolveUserId(userIdHeader);

            ExpenseResponse expenseResponse = expenseService.createExpense(userId, request);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Expense created successfully!");
            response.put("data", expenseResponse);

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(response);
        }
    }

    // Helper method
    private String resolveUserId(String headerUserId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof String s && s != null && !s.isBlank()) {
                return s;
            }
        }
        if (headerUserId != null && !headerUserId.isBlank()) {
            return headerUserId;
        }
        throw new RuntimeException("User not authenticated and User-ID header missing");
    }

    // Get all expenses for user (with pagination)
    @GetMapping
    public ResponseEntity<?> getUserExpenses(@RequestHeader(value = "User-ID", required = false) String userIdHeader,
                                             @RequestParam(defaultValue = "0") int page,
                                             @RequestParam(defaultValue = "20") int size) {
        try {
            // Get user ID from JWT token via security context
            String userId = resolveUserId(userIdHeader);

            Page<ExpenseResponse> expenses = expenseService.getUserExpensesPaginated(userId, page, size);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", expenses.getContent());
            response.put("totalElements", expenses.getTotalElements());
            response.put("totalPages", expenses.getTotalPages());
            response.put("currentPage", expenses.getNumber());
            response.put("pageSize", expenses.getSize());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(response);
        }
    }

    // Get expense by ID
    @GetMapping("/{expenseId}")
    public ResponseEntity<?> getExpenseById(@RequestHeader(value = "User-ID", required = false) String userIdHeader,
                                            @PathVariable String expenseId) {
        try {

            String userId = resolveUserId(userIdHeader);
            ExpenseResponse expense = expenseService.getExpenseById(userId, expenseId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", expense);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(response);
        }
    }

    // Update expense
    @PutMapping("/{expenseId}")
    public ResponseEntity<?> updateExpense(@RequestHeader(value = "User-ID", required = false) String userIdHeader,
                                           @PathVariable String expenseId,
                                           @Valid @RequestBody UpdateExpenseRequest request) {
        try {
            String userId = resolveUserId(userIdHeader);
            ExpenseResponse expenseResponse = expenseService.updateExpense(userId, expenseId, request);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Expense updated successfully!");
            response.put("data", expenseResponse);

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(response);
        }
    }

    // Delete expense
    @DeleteMapping("/{expenseId}")
    public ResponseEntity<?> deleteExpense(@RequestHeader(value = "User-ID", required = false) String userIdHeader,
                                           @PathVariable String expenseId) {
        try {
            String userId = resolveUserId(userIdHeader);
            expenseService.deleteExpense(userId, expenseId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("message", "Expense deleted successfully!");

            return ResponseEntity.ok(response);
        } catch (RuntimeException e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(response);
        }
    }

    @GetMapping("/category/{categoryId}")
    public ResponseEntity<?> getExpensesByCategory(@RequestHeader(value = "User-ID", required = false) String userIdHeader,
                                                   @PathVariable String categoryId) {
        try {
            String userId = resolveUserId(userIdHeader);
            List<ExpenseResponse> expenses = expenseService.getExpensesByCategory(userId, categoryId);

            Map<String, Object> response = new HashMap<>();
            response.put("success", true);
            response.put("data", expenses);
            response.put("count", expenses.size());

            return ResponseEntity.ok(response);
        } catch (Exception e) {
            Map<String, Object> response = new HashMap<>();
            response.put("success", false);
            response.put("message", e.getMessage());

            return ResponseEntity.badRequest().body(response);
        }
    }
}
