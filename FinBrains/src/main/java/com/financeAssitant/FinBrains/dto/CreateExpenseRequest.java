package com.financeAssitant.FinBrains.dto;

import com.fasterxml.jackson.annotation.JsonAlias;
import jakarta.validation.constraints.*;
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
public class CreateExpenseRequest {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    @DecimalMax(value = "10000000.00", message = "Amount too large")
    private Double amount;

    @NotBlank(message = "Description is required")
    @Size(max = 255, message = "Description too long")
    private String description;

    // EXPENSE or INCOME (default EXPENSE if not provided)
    private String type;

    // Single category by ID
    private String categoryId;
    private String subcategory;

    private LocalDateTime date; // Optional, defaults to now

    // Payment method details
    private String paymentType; // cash, card, upi, wallet
    private String paymentProvider;
    private String lastFourDigits;

    // Optional fields
    private java.util.List<String> tags;
    private Boolean isRecurring;
    @JsonAlias({"frequency", "recurringFrequency"})
    private String recurringFrequency;
    private LocalDate startDate;
    private LocalDate endDate;

    // Validation
    @AssertTrue(message = "Date cannot be in the future")
    public boolean isValidDate() {
        return date == null || !date.isAfter(LocalDateTime.now().plusDays(1));
    }

    @AssertTrue(message = "Recurring frequency is required when recurring is enabled")
    public boolean isRecurringFrequencyValid() {
        if (Boolean.TRUE.equals(isRecurring)) {
            return recurringFrequency != null && !recurringFrequency.isBlank();
        }
        return true;
    }

    @AssertTrue(message = "Start date is required when recurring is enabled")
    public boolean isStartDatePresentWhenRecurring() {
        if (Boolean.TRUE.equals(isRecurring)) {
            return startDate != null;
        }
        return true;
    }

    @AssertTrue(message = "Start date cannot be after end date")
    public boolean isStartBeforeEnd() {
        if (startDate != null && endDate != null) {
            return !startDate.isAfter(endDate);
        }
        return true;
    }
}
