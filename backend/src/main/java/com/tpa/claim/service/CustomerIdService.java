package com.tpa.claim.service;

import com.tpa.claim.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.security.SecureRandom;

@Service
public class CustomerIdService {

    private static final String PREFIX = "CUST-";
    private static final String ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    private static final int RANDOM_LENGTH = 8;

    private final UserRepository userRepository;
    private final SecureRandom secureRandom = new SecureRandom();

    public CustomerIdService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public String generateUniqueCustomerId() {
        String customerId;
        do {
            customerId = PREFIX + randomCode();
        } while (userRepository.existsByCustomerId(customerId));
        return customerId;
    }

    private String randomCode() {
        StringBuilder code = new StringBuilder(RANDOM_LENGTH);
        for (int i = 0; i < RANDOM_LENGTH; i++) {
            code.append(ALPHABET.charAt(secureRandom.nextInt(ALPHABET.length())));
        }
        return code.toString();
    }
}
