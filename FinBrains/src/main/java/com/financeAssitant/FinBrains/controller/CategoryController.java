package com.financeAssitant.FinBrains.controller;

import com.financeAssitant.FinBrains.dto.CategoryCreateRequest;
import com.financeAssitant.FinBrains.entity.Category;
import com.financeAssitant.FinBrains.service.CategoryService;
import com.financeAssitant.FinBrains.repository.ExpenseRepository;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Arrays;
import java.util.stream.Collectors;
import java.util.Set;
import java.util.HashSet;
import java.util.LinkedHashMap;

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;
    private final ExpenseRepository expenseRepository;

    @GetMapping
    public ResponseEntity<?> getAll() {
        String userId = resolveUserId();
        if (userId == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Unauthorized: missing or invalid token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }
        List<Category> categories = categoryService.getAll(userId);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", categories);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/keywords")
    public ResponseEntity<?> getWithKeywords() {
        String userId = resolveUserId();
        if (userId == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Unauthorized: missing or invalid token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }
        List<Category> categories = categoryService.getAll(userId);
        Set<String> stop = new HashSet<>(Arrays.asList("the","a","an","and","to","for","of","on","in","at","with","by","is","was","this","that","order","payment","txn","paid","bill","recharge"));
        var data = categories.stream().map(c -> {
            String nm = c.getName() == null ? "" : c.getName();
            List<String> base = Arrays.stream(nm.toLowerCase().split("[^a-z0-9]+"))
                    .filter(s -> s != null && !s.isBlank())
                    .collect(Collectors.toList());

            // Learn from user's past expenses for this category (recent first)
            var recent = expenseRepository.findByUserIdAndCategory_IdOrderByDateDesc(userId, c.getId());
            Map<String, Integer> freq = new LinkedHashMap<>();
            for (var e : recent) {
                String desc = e.getDescription();
                if (desc == null) continue;
                String[] toks = desc.toLowerCase().split("[^a-z0-9]+");
                for (String t : toks) {
                    if (t == null || t.isBlank()) continue;
                    if (stop.contains(t)) continue;
                    if (t.length() < 3) continue;
                    freq.put(t, freq.getOrDefault(t, 0) + 1);
                }
            }
            List<String> learned = freq.entrySet().stream()
                    .sorted((a,b)->Integer.compare(b.getValue(), a.getValue()))
                    .limit(12)
                    .map(Map.Entry::getKey)
                    .collect(Collectors.toList());

            // Merge and distinct
            List<String> kws = Arrays.asList(new String[0]);
            kws = java.util.stream.Stream.concat(base.stream(), learned.stream())
                    .distinct()
                    .collect(Collectors.toList());

            Map<String,Object> m = new HashMap<>();
            m.put("id", c.getId());
            m.put("name", c.getName());
            m.put("keywords", kws);
            return m;
        }).collect(Collectors.toList());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("data", data);
        return ResponseEntity.ok(response);
    }

    @PostMapping
    public ResponseEntity<?> create(@Valid @RequestBody CategoryCreateRequest request) {
        String userId = resolveUserId();
        if (userId == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Unauthorized: missing or invalid token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }
        Category created = categoryService.create(userId, request.getName(), request.getIsPredefined() != null && request.getIsPredefined());
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Category created successfully!");
        response.put("data", created);
        return new ResponseEntity<>(response, HttpStatus.CREATED);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> delete(@PathVariable String id) {
        String userId = resolveUserId();
        if (userId == null) {
            Map<String, Object> err = new HashMap<>();
            err.put("success", false);
            err.put("message", "Unauthorized: missing or invalid token");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body(err);
        }
        categoryService.delete(userId, id);
        Map<String, Object> response = new HashMap<>();
        response.put("success", true);
        response.put("message", "Category deleted successfully!");
        return ResponseEntity.ok(response);
    }

    private String resolveUserId() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication != null && authentication.isAuthenticated()) {
            Object principal = authentication.getPrincipal();
            if (principal instanceof String s && s != null && !s.isBlank()) {
                return s;
            }
        }
        return null;
    }
}
