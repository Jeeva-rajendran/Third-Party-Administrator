package com.tpa.claim.repository;

import com.tpa.claim.model.Role;
import com.tpa.claim.model.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long> {
    Optional<User> findByUsername(String username);
    Boolean existsByUsername(String username);
    Boolean existsByEmail(String email);
    Boolean existsByCustomerId(String customerId);
    List<User> findByRole(Role role);
}
