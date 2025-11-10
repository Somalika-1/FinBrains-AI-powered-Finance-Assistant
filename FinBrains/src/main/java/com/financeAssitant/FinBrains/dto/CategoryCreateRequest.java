package com.financeAssitant.FinBrains.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CategoryCreateRequest {
    @NotBlank(message = "Category name is required")
    private String name;
    private Boolean isPredefined = false;
}
