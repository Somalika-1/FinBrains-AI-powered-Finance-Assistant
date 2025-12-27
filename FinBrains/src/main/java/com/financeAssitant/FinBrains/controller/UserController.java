package com.financeAssitant.FinBrains.controller;

import com.financeAssitant.FinBrains.dto.MonthlySummaryResponse;
import com.financeAssitant.FinBrains.entity.User;
import com.financeAssitant.FinBrains.repository.UserRepository;
import com.financeAssitant.FinBrains.service.ExpenseService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.time.YearMonth;
import java.util.HashMap;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    @Autowired
    private ExpenseService expenseService;

    @Autowired
    private UserRepository userRepository;

    @GetMapping("/me/monthly-summary")
    public ResponseEntity<?> getMyMonthlySummary(@RequestHeader(value = "User-ID", required = false) String userIdHeader) {
        String userId = resolveUserId(userIdHeader);
        if (userId == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Unauthorized: missing or invalid token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }

        // Try by userId; if not found, try by email (for principals that use email as username)
        var userOpt = userRepository.findById(userId);
        if (userOpt.isEmpty()) {
            userOpt = userRepository.findByEmail(userId);
        }
        String name = userOpt.map(u -> {
            User.Profile p = u.getProfile();
            String first = p != null ? (p.getFirstName() != null ? p.getFirstName() : "") : "";
            String last = p != null ? (p.getLastName() != null ? p.getLastName() : "") : "";
            String full = (first + " " + last).trim();
            return full.isEmpty() ? u.getEmail() : full;
        }).orElse("User");

        YearMonth ym = YearMonth.now();
        double income = expenseService.getMonthlyIncome(userId, ym);
        double spent = expenseService.getMonthlySpent(userId, ym);
        double balance = income - spent;

        MonthlySummaryResponse body = MonthlySummaryResponse.builder()
                .name(name)
                .month(ym.toString())
                .income(income)
                .spent(spent)
                .balance(balance)
                .build();

        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("data", body);
        return ResponseEntity.ok(res);
    }

    private String resolveUserId(String headerUserId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof org.springframework.security.core.userdetails.User) {
                return ((org.springframework.security.core.userdetails.User) principal).getUsername();
            }
            if (principal instanceof String) {
                return (String) principal;
            }
            // Fallback to Authentication#getName(), which is commonly the username/subject
            String name = authentication.getName();
            if (name != null && !name.isBlank()) return name;
        }
        // Fallback to header when not available in security context (e.g., during early dev)
        return headerUserId;
    }
}
