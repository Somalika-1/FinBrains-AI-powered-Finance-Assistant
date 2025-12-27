package com.financeAssitant.FinBrains.controller;

import com.financeAssitant.FinBrains.service.BudgetService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.YearMonth;
import java.util.HashMap;
import java.util.Map;
import java.security.Principal;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;

@RestController
@RequestMapping("/api/budget")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"}, allowCredentials = "true")
public class BudgetController {

    @Autowired
    private BudgetService budgetService;

    @PostMapping
    public ResponseEntity<?> setBudget(@AuthenticationPrincipal Object authUser,
                                       Principal principal,
                                       @RequestHeader(value = "User-ID", required = false) String userIdHeader,
                                       @RequestBody Map<String, Object> payload) {
        String userId = resolveUserId(userIdHeader);
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
        }
        Object amtObj = payload.get("amount");
        if (amtObj == null) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "amount is required"));
        }
        Double amount = Double.valueOf(String.valueOf(amtObj));
        YearMonth ym = YearMonth.now();
        var budget = budgetService.setOrUpdateBudget(userId, amount, ym);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Budget saved successfully");
        res.put("data", budget);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/current")
    public ResponseEntity<?> getCurrent(@AuthenticationPrincipal Object authUser,
                                        Principal principal,
                                        @RequestHeader(value = "User-ID", required = false) String userIdHeader) {
        String userId = resolveUserId(userIdHeader);
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
        }
        var budget = budgetService.getCurrentBudget(userId);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", budget == null ? "No budget set for current month" : "Budget fetched successfully");
        res.put("data", budget);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/status")
    public ResponseEntity<?> status(@AuthenticationPrincipal Object authUser,
                                    Principal principal,
                                    @RequestHeader(value = "User-ID", required = false) String userIdHeader,
                                    @RequestParam(required = false) String month) {
        String userId = resolveUserId(userIdHeader);
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
        }
        YearMonth ym;
        try {
            ym = (month != null && !month.isBlank()) ? YearMonth.parse(month) : YearMonth.now();
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid month format. Expected YYYY-MM"));
        }
        Map<String, Object> data = budgetService.getStatus(userId, ym);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", "Budget status fetched successfully");
        res.put("data", data);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/history")
    public ResponseEntity<?> history(@AuthenticationPrincipal Object authUser,
                                     Principal principal,
                                     @RequestHeader(value = "User-ID", required = false) String userIdHeader,
                                     @RequestParam String from,
                                     @RequestParam String to) {
        String userId = resolveUserId(userIdHeader);
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
        }
        try {
            YearMonth ymFrom = YearMonth.parse(from);
            YearMonth ymTo = YearMonth.parse(to);
            var data = budgetService.getHistory(userId, ymFrom, ymTo);
            return ResponseEntity.ok(Map.of("success", true, "data", data));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid month format. Expected YYYY-MM"));
        }
    }

    @GetMapping("/breakdown")
    public ResponseEntity<?> breakdown(@AuthenticationPrincipal Object authUser,
                                       Principal principal,
                                       @RequestHeader(value = "User-ID", required = false) String userIdHeader,
                                       @RequestParam String month) {
        String userId = resolveUserId(userIdHeader);
        if (userId == null || userId.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
        }
        try {
            YearMonth ym = YearMonth.parse(month);
            var data = budgetService.getCategoryBreakdown(userId, ym);
            return ResponseEntity.ok(Map.of("success", true, "data", data));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid month format. Expected YYYY-MM"));
        }
    }

    private String resolveUserId(String headerUserId) {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            try {
                return authentication.getName();
            } catch (Exception ignored) {}
        }
        return headerUserId;
    }
}
