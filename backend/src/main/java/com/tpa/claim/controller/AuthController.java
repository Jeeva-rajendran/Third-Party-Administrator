package com.tpa.claim.controller;

import com.tpa.claim.model.Role;
import com.tpa.claim.model.User;
import com.tpa.claim.repository.UserRepository;
import com.tpa.claim.security.JwtUtils;
import com.tpa.claim.service.CustomerIdService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import java.util.Map;
import jakarta.annotation.PostConstruct;

@CrossOrigin(origins = "*", maxAge = 3600)
@RestController
@RequestMapping("/api/auth")
public class AuthController {
    @Autowired
    AuthenticationManager authenticationManager;

    @Autowired
    UserRepository userRepository;

    @Autowired
    PasswordEncoder encoder;

    @Autowired
    JwtUtils jwtUtils;

    @Autowired
    CustomerIdService customerIdService;

    @PostConstruct
    public void seedUsers() {
        if (userRepository.count() == 0) {
            userRepository.save(new User(null, "fmg", encoder.encode("fmg123"), "Bob FMG", "fmg@tpa.com", null, Role.ROLE_FMG));
            userRepository.save(new User(null, "carrier", encoder.encode("carrier123"), "Carol Carrier", "carrier@tpa.com", null, Role.ROLE_CARRIER));
        }
    }

    @PostMapping("/login")
    public ResponseEntity<?> authenticateUser(@RequestBody Map<String, String> loginRequest) {
        Authentication authentication = authenticationManager.authenticate(
                new UsernamePasswordAuthenticationToken(loginRequest.get("username"), loginRequest.get("password")));
        SecurityContextHolder.getContext().setAuthentication(authentication);
        String jwt = jwtUtils.generateJwtToken(authentication);

        User user = userRepository.findByUsername(loginRequest.get("username")).orElseThrow();

        return ResponseEntity.ok(Map.of(
                "token", jwt,
                "id", user.getId(),
                "customerId", user.getCustomerId() != null ? user.getCustomerId() : "",
                "username", user.getUsername(),
                "name", user.getName(),
                "role", user.getRole().name()
        ));
    }

    @PostMapping("/register")
    public ResponseEntity<?> registerCustomer(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");
        String name = request.get("name");
        String email = request.get("email");

        if (username == null || password == null || name == null) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username, password, and name are required"));
        }
        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Username already exists"));
        }
        if (email != null && userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body(Map.of("error", "Email already exists"));
        }

        String customerId = customerIdService.generateUniqueCustomerId();
        User user = new User(null, username, encoder.encode(password), name, email, customerId, Role.ROLE_CUSTOMER);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of(
                "message", "Customer registered successfully",
                "customerId", customerId
        ));
    }
}
