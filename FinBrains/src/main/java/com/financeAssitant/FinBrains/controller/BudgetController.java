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

@RestController
@RequestMapping("/api/budget")
@CrossOrigin(origins = {"http://localhost:5173", "http://localhost:5174"}, allowCredentials = "true")
public class BudgetController {

    @Autowired
    private BudgetService budgetService;

    @PostMapping
    public ResponseEntity<?> setBudget(@AuthenticationPrincipal Object authUser, Principal principal, @RequestBody Map<String, Object> payload) {
        String userName = principal != null ? principal.getName() : null;
        if (userName == null || userName.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
        }
        String userId = userName;
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
    public ResponseEntity<?> getCurrent(@AuthenticationPrincipal Object authUser, Principal principal) {
        String userName = principal != null ? principal.getName() : null;
        if (userName == null || userName.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
        }
        String userId = userName;
        var budget = budgetService.getCurrentBudget(userId);
        Map<String, Object> res = new HashMap<>();
        res.put("success", true);
        res.put("message", budget == null ? "No budget set for current month" : "Budget fetched successfully");
        res.put("data", budget);
        return ResponseEntity.ok(res);
    }

    @GetMapping("/status")
    public ResponseEntity<?> status(@AuthenticationPrincipal Object authUser, Principal principal, @RequestParam(required = false) String month) {
        String userName = principal != null ? principal.getName() : null;
        if (userName == null || userName.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
        }
        String userId = userName;
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
    public ResponseEntity<?> history(@AuthenticationPrincipal Object authUser, Principal principal,
                                     @RequestParam String from,
                                     @RequestParam String to) {
        String userName = principal != null ? principal.getName() : null;
        if (userName == null || userName.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
        }
        try {
            YearMonth ymFrom = YearMonth.parse(from);
            YearMonth ymTo = YearMonth.parse(to);
            var data = budgetService.getHistory(userName, ymFrom, ymTo);
            return ResponseEntity.ok(Map.of("success", true, "data", data));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid month format. Expected YYYY-MM"));
        }
    }

    @GetMapping("/breakdown")
    public ResponseEntity<?> breakdown(@AuthenticationPrincipal Object authUser, Principal principal,
                                       @RequestParam String month) {
        String userName = principal != null ? principal.getName() : null;
        if (userName == null || userName.isBlank()) {
            return ResponseEntity.status(401).body(Map.of("success", false, "message", "Unauthorized"));
        }
        try {
            YearMonth ym = YearMonth.parse(month);
            var data = budgetService.getCategoryBreakdown(userName, ym);
            return ResponseEntity.ok(Map.of("success", true, "data", data));
        } catch (Exception ex) {
            return ResponseEntity.badRequest().body(Map.of("success", false, "message", "Invalid month format. Expected YYYY-MM"));
        }
    }
}
