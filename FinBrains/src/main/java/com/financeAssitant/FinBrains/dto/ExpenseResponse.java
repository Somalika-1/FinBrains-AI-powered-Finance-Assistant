package com.financeAssitant.FinBrains.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.time.LocalDate;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseResponse {
    private String id;
    private Double amount;
    private String description;
    private String type; // EXPENSE or INCOME
    private CategoryResponse category;
    private String subcategory;
    private LocalDateTime date;
    private PaymentMethodResponse paymentMethod;
    private java.util.List<String> tags;
    private Boolean isRecurring;
    private String recurringFrequency;
    private LocalDateTime nextRunDate;
    private LocalDate startDate;
    private LocalDate endDate;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class CategoryResponse {
        private String id;
        private String name;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PaymentMethodResponse {
        private String type;
        private String provider;
        private String lastFourDigits;
    }
}