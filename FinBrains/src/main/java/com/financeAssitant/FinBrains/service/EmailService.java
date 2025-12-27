package com.financeAssitant.FinBrains.service;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Service;

@Service
public class EmailService {

    private final JavaMailSender mailSender;

    @Value("${app.backend.url:http://localhost:8080}")
    private String backendUrl;

    @Value("${app.frontend.url:http://localhost:5173}")
    private String frontendUrl;

    public EmailService(JavaMailSender mailSender) {
        this.mailSender = mailSender;
    }

    public void sendVerificationEmail(String toEmail, String firstName, String verificationToken) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Verify Your Finance Assistant Account");
            message.setText(String.format(
                    "Hello %s,\n\n" +
                            "Welcome to Finance Assistant! Please verify your email address by clicking the link below:\n\n" +
                            "%s/api/auth/verify?token=%s\n\n" +
                            "This link will expire in 24 hours.\n\n" +
                            "If you didn't create this account, please ignore this email.\n\n" +
                            "Best regards,\n" +
                            "Finance Assistant Team",
                    firstName, backendUrl, verificationToken
            ));
            message.setFrom("noreply@financeassistant.com");

            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send verification email: " + e.getMessage());
            // Don't throw exception - allow signup to continue even if email fails
        }
    }

    public void sendResetEmail(String toEmail, String firstName, String resetToken, String baseUrl) {
        try {
            SimpleMailMessage message = new SimpleMailMessage();
            message.setTo(toEmail);
            message.setSubject("Reset Your Finance Assistant Password");
            String effectiveBase = (baseUrl == null || baseUrl.isBlank()) ? frontendUrl : baseUrl;
            if (effectiveBase.endsWith("/")) {
                effectiveBase = effectiveBase.substring(0, effectiveBase.length() - 1);
            }
            message.setText(String.format(
                    "Hello %s,\n\n" +
                            "You requested a password reset. Click the link below to set a new password:\n\n" +
                            "%s/reset-password?token=%s\n\n" +
                            "This link will expire in 30 minutes.\n\n" +
                            "If you didn't request this, you can safely ignore this email.\n\n" +
                            "Best regards,\n" +
                            "Finance Assistant Team",
                    firstName, effectiveBase, resetToken
            ));
            message.setFrom("noreply@financeassistant.com");
            mailSender.send(message);
        } catch (Exception e) {
            System.err.println("Failed to send reset email: " + e.getMessage());
        }
    }
}