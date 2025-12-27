package com.financeAssitant.FinBrains;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableScheduling;

@SpringBootApplication
@EnableScheduling
public class FinBrainsApplication {

    public static void main(String[] args) {
        SpringApplication.run(FinBrainsApplication.class, args);
    }

}
