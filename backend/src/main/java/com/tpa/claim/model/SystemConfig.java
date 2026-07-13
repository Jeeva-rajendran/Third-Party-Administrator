package com.tpa.claim.model;

import jakarta.persistence.*;
import lombok.Data;
import lombok.NoArgsConstructor;
import lombok.AllArgsConstructor;

@Entity
@Table(name = "system_configs")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SystemConfig {

    @Id
    @Column(name = "config_key", unique = true, nullable = false)
    private String key;

    @Column(name = "config_value", nullable = false)
    private String value;

    @Column(name = "description")
    private String description;
}
