package car.repair.shop.repair.request.controller;

import car.repair.shop.repair.request.RepairRequestPublicStatusQueryHandler;
import lombok.RequiredArgsConstructor;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.Map;

/**
 * Unauthenticated API behind the customer's status link. The token in the path is the only
 * credential, so every failure looks the same: an unknown, malformed and expired token all get
 * the identical 404, giving no hint whether a token ever existed.
 */
@RestController
@RequestMapping("/api/public/repair-request/status")
@RequiredArgsConstructor
public class RepairRequestPublicController {
    private static final Map<String, String> NOT_FOUND_BODY = Map.of("message", "Not found");

    private final RepairRequestPublicStatusQueryHandler repairRequestPublicStatusQueryHandler;

    @GetMapping("/{token}")
    public ResponseEntity<Object> getStatus(@PathVariable String token) {
        return repairRequestPublicStatusQueryHandler.getByTrackingToken(token)
                // Never cached: the customer must see a change the moment the workshop makes it
                // (and, later, the result of their own cancel / reschedule), and the page holds
                // personal data behind a secret URL.
                .<ResponseEntity<Object>>map(status -> ResponseEntity.ok()
                        .cacheControl(CacheControl.noStore())
                        .body(status))
                .orElseGet(() -> ResponseEntity.status(HttpStatus.NOT_FOUND)
                        .cacheControl(CacheControl.noStore())
                        .contentType(MediaType.APPLICATION_JSON)
                        .body(NOT_FOUND_BODY));
    }
}
