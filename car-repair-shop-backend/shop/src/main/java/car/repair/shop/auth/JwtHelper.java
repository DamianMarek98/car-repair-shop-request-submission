package car.repair.shop.auth;

import io.jsonwebtoken.Claims;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.security.SignatureException;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.stereotype.Service;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Date;
import java.util.Map;

@Service
public class JwtHelper {
    public static final String USERNAME = "username";
    private static final int DAYS = 1;

    @Value("${car.repair.shop.aws.jwt-secret-key}")
    private String secretKeyString;

    private SecretKey secretKey;

    public String generateToken(String username) {
        var now = Instant.now();
        return Jwts.builder()
                .claims(Map.of(USERNAME, username))
                .issuedAt(Date.from(now))
                .expiration(Date.from(now.plus(DAYS, ChronoUnit.DAYS)))
                .signWith(getSecretKey())
                .compact();
    }

    public String extractUsername(String token) {
        return getTokenBody(token).get(USERNAME, String.class);
    }

    public Boolean validateToken(String token, UserDetails userDetails) {
        final String username = extractUsername(token);
        return username.equals(userDetails.getUsername()) && !isTokenExpired(token);
    }

    private Claims getTokenBody(String token) {
        try {
            return Jwts
                    .parser()
                    .verifyWith(getSecretKey())
                    .build()
                    .parseSignedClaims(token)
                    .getPayload();
        } catch (SignatureException | ExpiredJwtException e) { // Invalid signature or expired token
            throw new AccessDeniedException("Access denied: " + e.getMessage());
        }
    }

    private boolean isTokenExpired(String token) {
        Claims claims = getTokenBody(token);
        return claims.getExpiration().before(new Date());
    }

    private SecretKey getSecretKey() {
        if (secretKey == null) {
            secretKey = Keys.hmacShaKeyFor(secretKeyString.getBytes(StandardCharsets.UTF_8));
        }
        return secretKey;
    }
}
