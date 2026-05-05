package com.tpa.claim.controller;

import com.tpa.claim.model.Role;
import com.tpa.claim.model.User;
import com.tpa.claim.repository.UserRepository;
import com.tpa.claim.security.JwtUtils;
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

    @PostConstruct
    public void seedUsers() {
        if (userRepository.count() == 0) {
            userRepository.save(new User(null, "customer", encoder.encode("customer123"), "John Customer", "customer@tpa.com", Role.ROLE_CUSTOMER));
            userRepository.save(new User(null, "client", encoder.encode("client123"), "Alice Client", "client@tpa.com", Role.ROLE_CLIENT));
            userRepository.save(new User(null, "fmg", encoder.encode("fmg123"), "Bob FMG", "fmg@tpa.com", Role.ROLE_FMG));
            userRepository.save(new User(null, "carrier", encoder.encode("carrier123"), "Carol Carrier", "carrier@tpa.com", Role.ROLE_CARRIER));
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
            return ResponseEntity.badRequest().body("Username, password, and name are required");
        }
        if (userRepository.existsByUsername(username)) {
            return ResponseEntity.badRequest().body("Username already exists");
        }
        if (email != null && userRepository.existsByEmail(email)) {
            return ResponseEntity.badRequest().body("Email already exists");
        }

        User user = new User(null, username, encoder.encode(password), name, email, Role.ROLE_CUSTOMER);
        userRepository.save(user);

        return ResponseEntity.ok(Map.of("message", "Customer registered successfully"));
    }
}
