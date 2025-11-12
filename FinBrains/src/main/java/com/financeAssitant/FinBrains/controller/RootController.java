package com.financeAssitant.FinBrains.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class RootController {

    @GetMapping("/")
    public ResponseEntity<String> index() {
        return ResponseEntity.ok("Backend is running!");
    }
}
