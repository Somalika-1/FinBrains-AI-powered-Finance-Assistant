package com.financeAssitant.FinBrains.aimlservices.service;

import java.util.Optional;

public interface LLMClient {
    Optional<String> generate(String prompt);
}
