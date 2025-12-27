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
public class FinancialInsightRequest {
    private Double monthlyIncome; // after tax
    private Map<String, Double> monthlyExpensesByCategory; // e.g., Housing, Food, Transport
    private Double monthlySavings; // amount set aside monthly

    // Optional details
    private List<Investment> investments; // type, amount
    private List<Liability> liabilities; // loan EMIs, credit card dues
    private Goals goals; // short-term & long-term

    // Optional: current emergency fund balance (liquid)
    private Double emergencyFundBalance;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Investment {
        private String type; // e.g., Mutual Fund, FD, Stocks
        private Double amount;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Liability {
        private String name; // e.g., Home Loan, Credit Card
        private Double monthlyEmi;
    }

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class Goals {
        private List<String> shortTerm;
        private List<String> longTerm;
    }
}
