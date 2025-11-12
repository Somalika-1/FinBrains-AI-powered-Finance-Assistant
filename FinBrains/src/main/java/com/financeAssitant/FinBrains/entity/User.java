package com.financeAssitant.FinBrains.entity;

import com.fasterxml.jackson.annotation.JsonIgnore;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.springframework.data.annotation.Id;
import org.springframework.data.mongodb.core.index.Indexed;
import org.springframework.data.mongodb.core.mapping.Document;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Document(collection = "users")
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class User {

    @Id
    private String id;

    @Indexed(unique = true)
    private String email;

    @JsonIgnore
    private String password;

    @Builder.Default
    private Profile profile = new Profile();

    @Builder.Default
    private Authentication authentication = new Authentication();

    @Builder.Default
    private Metadata metadata = new Metadata();

    @Builder.Default
    private List<String> roles = new ArrayList<>(List.of("USER"));

    // Custom constructor to ensure proper initialization
    public User(String email, String password) {
        this.email = email;
        this.password = password;
        this.profile = new Profile();
        this.authentication = new Authentication();
        this.metadata = new Metadata();
        this.metadata.setCreatedAt(LocalDateTime.now());
        this.metadata.setUpdatedAt(LocalDateTime.now());
    }

    // Profile nested class
    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Profile {
        private String firstName;
        private String lastName;
        private String phone;
        private String dateOfBirth;
        private String occupation;
        private Double monthlyIncome;

        @Builder.Default
        private String currency = "INR";

        @Builder.Default
        private String timezone = "Asia/Kolkata";

        @Builder.Default
        private String language = "en";
    }

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    @Builder
    public static class Authentication {
        private String googleId;

        @Builder.Default
        private Boolean emailVerified = true;

        private String emailVerificationToken;
        private String resetToken;
        private LocalDateTime resetTokenExpiry;
        private LocalDateTime lastLogin;
    }

    @Data
    @AllArgsConstructor
    @Builder
    public static class Metadata {
        private LocalDateTime createdAt;
        private LocalDateTime updatedAt;

        @Builder.Default
        private Boolean isActive = true;

        // Constructor to set timestamps
        public Metadata() {
            this.createdAt = LocalDateTime.now();
            this.updatedAt = LocalDateTime.now();
            this.isActive = true;
        }
    }
}