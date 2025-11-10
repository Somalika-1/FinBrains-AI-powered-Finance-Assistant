package com.financeAssitant.FinBrains.dto;

import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.Size;
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
public class UpdateExpenseRequest {

    @DecimalMin(value = "0.01", message = "Amount must be greater than 0")
    @DecimalMax(value = "10000000.00", message = "Amount too large")
    private Double amount;

    @Size(max = 255, message = "Description too long")
    private String description;

    // Multiple categories by ID
    private List<String> categoryIds;
    private String subcategory;
    private LocalDateTime date;

    // Payment method details
    private String paymentType;
    private String paymentProvider;
    private String lastFourDigits;

    // Optional fields
    private List<String> tags;
    private Boolean isRecurring;
    private String recurringFrequency;
}