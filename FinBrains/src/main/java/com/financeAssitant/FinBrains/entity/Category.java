package com.financeAssitant.FinBrains.entity;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.index.CompoundIndex;
import org.springframework.data.mongodb.core.index.CompoundIndexes;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;

@Document(collection = "categories")
@CompoundIndexes({
        @CompoundIndex(name = "uniq_user_name", def = "{ 'userId': 1, 'name': 1 }", unique = true)
})
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Category {

    @Id
    private String id;

    private String name;

    @Indexed
    private String userId; // owner of the category

    @Builder.Default
    private boolean isPredefined = false;

    @Builder.Default
    private LocalDateTime createdAt = LocalDateTime.now();
}
