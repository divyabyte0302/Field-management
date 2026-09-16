package com.keystone.security;

import org.springframework.stereotype.Service;

import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;

@Service
public class TokenBlacklistService {

    private final Set<String> blacklistedTokens = ConcurrentHashMap.newKeySet();
    private final Set<String> blacklistedRefreshTokens = ConcurrentHashMap.newKeySet();

    public void blacklistToken(String token) {
        if (token != null && !token.isBlank()) {
            blacklistedTokens.add(token);
        }
    }

    public boolean isTokenBlacklisted(String token) {
        if (token == null || token.isBlank()) return false;
        return blacklistedTokens.contains(token);
    }

    public void blacklistRefreshToken(String refreshToken) {
        if (refreshToken != null && !refreshToken.isBlank()) {
            blacklistedRefreshTokens.add(refreshToken);
        }
    }

    public boolean isRefreshTokenBlacklisted(String refreshToken) {
        if (refreshToken == null || refreshToken.isBlank()) return false;
        return blacklistedRefreshTokens.contains(refreshToken);
    }
}
