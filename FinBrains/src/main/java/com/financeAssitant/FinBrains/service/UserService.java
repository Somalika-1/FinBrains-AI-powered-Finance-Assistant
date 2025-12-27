package com.financeAssitant.FinBrains.service;

import com.financeAssitant.FinBrains.dto.AuthResponse;
import com.financeAssitant.FinBrains.dto.LoginRequest;
import com.financeAssitant.FinBrains.dto.SignupRequest;
import com.financeAssitant.FinBrains.entity.User;
import com.financeAssitant.FinBrains.repository.UserRepository;
import com.financeAssitant.FinBrains.utility.JwtUtils;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.Optional;
import java.util.UUID;

@Service
public class UserService {

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private PasswordEncoder passwordEncoder;

    @Autowired
    private JwtUtils jwtUtils;

    @Autowired
    private EmailService emailService;

    private boolean isStrongPassword(String p) {
        return p != null && p.length() >= 8 &&
                p.matches(".*[A-Z].*") &&
                p.matches(".*[a-z].*") &&
                p.matches(".*\\d.*") &&
                p.matches(".*[^A-Za-z0-9].*");
    }

    public AuthResponse signup(SignupRequest signupRequest) {
        // Check if user already exists
        if (userRepository.existsByEmail(signupRequest.getEmail())) {
            throw new RuntimeException("Email already registered!");
        }

        if (!isStrongPassword(signupRequest.getPassword())) {
            throw new RuntimeException("Password must be at least 8 characters and include upper, lower, digit, and special character.");
        }

        // Create new user
        User user = new User();
        user.setEmail(signupRequest.getEmail());
        user.setPassword(passwordEncoder.encode(signupRequest.getPassword()));

        // Set profile information
        User.Profile profile = new User.Profile();
        profile.setFirstName(signupRequest.getFirstName());
        profile.setLastName(signupRequest.getLastName());
        profile.setPhone(signupRequest.getPhone());
        profile.setDateOfBirth(signupRequest.getDateOfBirth());
        profile.setOccupation(signupRequest.getOccupation());
        profile.setMonthlyIncome(signupRequest.getMonthlyIncome());
        user.setProfile(profile);

        // Initialize metadata timestamps
        user.getAuthentication().setEmailVerified(true);
        user.getAuthentication().setEmailVerificationToken(null);
        user.getMetadata().setCreatedAt(LocalDateTime.now());
        user.getMetadata().setUpdatedAt(LocalDateTime.now());

        // Save user
        User savedUser = userRepository.save(user);

        // Skip sending verification email (feature disabled)

        // Generate JWT token
        String jwt = jwtUtils.generateJwtToken(savedUser.getId(), savedUser.getEmail());

        return AuthResponse.builder()
                .token(jwt)
                .userId(savedUser.getId())
                .email(savedUser.getEmail())
                .firstName(savedUser.getProfile().getFirstName())
                .lastName(savedUser.getProfile().getLastName())
                .build();
    }

    public AuthResponse login(LoginRequest loginRequest) {
        Optional<User> userOptional = userRepository.findByEmail(loginRequest.getEmail());

        if (userOptional.isEmpty()) {
            throw new RuntimeException("User not found!");
        }

        User user = userOptional.get();

        if (!passwordEncoder.matches(loginRequest.getPassword(), user.getPassword())) {
            throw new RuntimeException("Invalid password!");
        }

        // Email verification disabled; allow login without checking emailVerified

        // Update last login
        user.getAuthentication().setLastLogin(LocalDateTime.now());
        user.getMetadata().setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);

        // Generate JWT token
        String jwt = jwtUtils.generateJwtToken(user.getId(), user.getEmail());

        return AuthResponse.builder()
                .token(jwt)
                .userId(user.getId())
                .email(user.getEmail())
                .firstName(user.getProfile().getFirstName())
                .lastName(user.getProfile().getLastName())
                .build();
    }

    public User getCurrentUser(String userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new RuntimeException("User not found!"));
    }

    public boolean verifyEmail(String token) {
        Optional<User> userOptional = userRepository.findByAuthentication_EmailVerificationToken(token);

        if (userOptional.isEmpty()) {
            return false;
        }

        User user = userOptional.get();
        user.getAuthentication().setEmailVerified(true);
        user.getAuthentication().setEmailVerificationToken(null);
        user.getMetadata().setUpdatedAt(LocalDateTime.now());

        userRepository.save(user);
        return true;
    }

    public void requestPasswordReset(String email, String redirectUrl) {
        Optional<User> userOptional = userRepository.findByEmail(email);
        if (userOptional.isEmpty()) return; // do not reveal existence
        User user = userOptional.get();
        String token = UUID.randomUUID().toString();
        user.getAuthentication().setResetToken(token);
        user.getAuthentication().setResetTokenExpiry(LocalDateTime.now().plusMinutes(30));
        userRepository.save(user);
        emailService.sendResetEmail(user.getEmail(), user.getProfile().getFirstName(), token, redirectUrl);
    }

    public boolean resetPassword(String token, String newPassword) {
        Optional<User> userOptional = userRepository.findByAuthentication_ResetToken(token);
        if (userOptional.isEmpty()) return false;
        User user = userOptional.get();
        if (user.getAuthentication().getResetTokenExpiry() == null || user.getAuthentication().getResetTokenExpiry().isBefore(LocalDateTime.now())) {
            return false;
        }
        if (!isStrongPassword(newPassword)) {
            throw new RuntimeException("Password must be at least 8 characters and include upper, lower, digit, and special character.");
        }
        user.setPassword(passwordEncoder.encode(newPassword));
        user.getAuthentication().setResetToken(null);
        user.getAuthentication().setResetTokenExpiry(null);
        user.getMetadata().setUpdatedAt(LocalDateTime.now());
        userRepository.save(user);
        return true;
    }
}
