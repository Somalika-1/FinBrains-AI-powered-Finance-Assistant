package com.financeAssitant.FinBrains.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MonthlySummaryResponse {
    private String name;
    private String month; // e.g., 2025-12
    private double income;
    private double spent;
    private double balance;
}
