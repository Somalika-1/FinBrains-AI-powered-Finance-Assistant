package com.financeAssitant.FinBrains.controller;

import com.financeAssitant.FinBrains.dto.CategoryCreateRequest;
import com.financeAssitant.FinBrains.entity.Category;
import com.financeAssitant.FinBrains.service.CategoryService;
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

@RestController
@RequestMapping("/api/categories")
@CrossOrigin(origins = "http://localhost:5173")
@RequiredArgsConstructor
public class CategoryController {

    private final CategoryService categoryService;

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
