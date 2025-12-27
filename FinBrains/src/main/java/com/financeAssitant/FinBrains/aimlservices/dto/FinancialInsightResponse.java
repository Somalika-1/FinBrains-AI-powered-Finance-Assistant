package com.financeAssitant.FinBrains.aimlservices.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class FinancialInsightResponse {
    private String summary;
    private List<String> insights;
    private List<String> recommendations;
    private Double impactScore; // optional
    private String closing;

    // Optional: echo computed metrics and flags for transparency
    private Map<String, Object> metrics;
    private List<String> flags;
}
