package com.financeAssitant.FinBrains.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
@Document(collection = "budgets")
@CompoundIndexes({
        @CompoundIndex(name = "user_month_unique", def = "{ 'userId': 1, 'month': 1 }", unique = true)
})
public class Budget {
    @Id
    private String id;

    private String userId; // reference to User.id

    // Format: YYYY-MM (e.g., 2025-11)
    private String month;

    private Double amount;
}
