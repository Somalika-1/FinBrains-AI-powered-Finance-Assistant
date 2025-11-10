package com.financeAssitant.FinBrains.dto;

import jakarta.validation.constraints.*;
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
public class CreateExpenseRequest {

    @NotNull(message = "Amount is required")
    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    @DecimalMax(value = "10000000.00", message = "Amount too large")
    private Double amount;

    @NotBlank(message = "Description is required")
    @Size(max = 255, message = "Description too long")
    private String description;

    // Multiple categories by ID
    private List<String> categoryIds;
    private String subcategory;

    private LocalDateTime date; // Optional, defaults to now

    // Payment method details
    private String paymentType; // cash, card, upi, wallet
    private String paymentProvider;
    private String lastFourDigits;

    // Optional fields
    private List<String> tags;
    private Boolean isRecurring;
    private String recurringFrequency;

    // Validation
    @AssertTrue(message = "Date cannot be in the future")
    public boolean isValidDate() {
        return date == null || !date.isAfter(LocalDateTime.now().plusDays(1));
    }
}
