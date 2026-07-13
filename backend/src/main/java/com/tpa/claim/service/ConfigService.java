package com.tpa.claim.service;

import com.tpa.claim.model.SystemConfig;
import com.tpa.claim.repository.SystemConfigRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import jakarta.annotation.PostConstruct;
import java.math.BigDecimal;
import java.util.List;

@Service
public class ConfigService {

    @Autowired
    private SystemConfigRepository configRepository;

    @PostConstruct
    public void initConfigs() {
        // Initialize default values if not present
        ensureConfig("RULE_R1_THRESHOLD", "100000", "Threshold for High Amount Rule (R1)");
        ensureConfig("RULE_R2_AGE_DAYS", "30", "Minimum days since policy purchase for Rule (R2)");
        ensureConfig("SLA_AMBER_HOURS", "12", "Hours before claim turns Amber");
        ensureConfig("SLA_RED_HOURS", "24", "Hours before claim turns Red (SLA Breach)");
    }

    private void ensureConfig(String key, String defaultValue, String desc) {
        if (!configRepository.existsById(key)) {
            configRepository.save(new SystemConfig(key, defaultValue, desc));
        }
    }

    public String getConfig(String key, String defaultValue) {
        return configRepository.findById(key)
                .map(SystemConfig::getValue)
                .orElse(defaultValue);
    }

    public BigDecimal getConfigAsBigDecimal(String key, String defaultValue) {
        return new BigDecimal(getConfig(key, defaultValue));
    }

    public int getConfigAsInt(String key, String defaultValue) {
        return Integer.parseInt(getConfig(key, defaultValue));
    }

    public List<SystemConfig> getAllConfigs() {
        return configRepository.findAll();
    }

    public void updateConfig(String key, String value) {
        SystemConfig config = configRepository.findById(key)
                .orElseThrow(() -> new IllegalArgumentException("Config key not found: " + key));
        config.setValue(value);
        configRepository.save(config);
    }
}
