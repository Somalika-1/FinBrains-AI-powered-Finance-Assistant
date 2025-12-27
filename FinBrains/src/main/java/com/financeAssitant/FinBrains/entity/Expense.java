package com.financeAssitant.FinBrains.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;
import org.springframework.data.mongodb.core.mapping.DBRef;

import java.time.LocalDateTime;
import java.time.LocalDate;
import java.util.List;

@Document(collection = "expenses")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Expense {

    @Id
    private String id;

    @Indexed
    private String userId; // Reference to User

    private Double amount;
    private String description;
    @DBRef
    private Category category;
    private String subcategory;
    private LocalDateTime date;
    private PaymentMethod paymentMethod;
    private List<String> tags;
    private Recurring recurring;
    private Metadata metadata;

    public enum ExpenseType { EXPENSE, INCOME }

    @Builder.Default
    private ExpenseType type = ExpenseType.EXPENSE;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class PaymentMethod {
        @Builder.Default
        private String type = "cash"; // cash, card, upi, wallet

        private String provider; // Bank or wallet name
        private String lastFourDigits;
        private String accountId; // Future reference to accounts
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Recurring {
        @Builder.Default
        private Boolean isRecurring = false;

        private String frequency; // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY, CUSTOM
        private LocalDateTime nextDue;
        private String recurringGroupId;
        private LocalDate startDate;
        private LocalDate endDate;
    }

    @Data
    @AllArgsConstructor
    @Builder
    public static class Metadata {
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        @Builder.Default
        private String createdBy = "user"; // user, import, api

        @Builder.Default
        private String source = "manual"; // manual, import, api, email

        private Integer version;

        public Metadata() {
            this.createdAt = LocalDateTime.now();
            this.updatedAt = LocalDateTime.now();
            this.createdBy = "user";
            this.source = "manual";
            this.version = 1;
        }
    }

    // Custom constructor with default values
    public Expense(String userId, Double amount, String description) {
        this.userId = userId;
        this.amount = amount;
        this.description = description;
        this.date = LocalDateTime.now();
        this.paymentMethod = new PaymentMethod();
        this.recurring = new Recurring();
        this.metadata = new Metadata();
    }
}
