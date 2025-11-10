package com.financeAssitant.FinBrains.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ExpenseResponse {
    private String id;
    private Double amount;
    private String description;
    private List<CategoryResponse> categories;
    private String subcategory;
    private LocalDateTime date;
    private PaymentMethodResponse paymentMethod;
    private List<String> tags;
    private Boolean isRecurring;
    private String recurringFrequency;
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