package com.financeAssitant.FinBrains.repository;

import com.financeAssitant.FinBrains.entity.User;
import org.bson.types.ObjectId;
import org.springframework.data.mongodb.repository.MongoRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface UserRepository extends MongoRepository<User, String> {
    Optional<User> findByEmail(String email);
    Optional<User> findByAuthentication_GoogleId(String googleId);
    boolean existsByEmail(String email);
    Optional<User> findByAuthentication_EmailVerificationToken(String token);
    Optional<User> findByAuthentication_ResetToken(String token);
}