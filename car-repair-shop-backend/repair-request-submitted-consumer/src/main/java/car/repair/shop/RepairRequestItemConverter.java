package car.repair.shop;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.security.SecureRandom;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class RepairRequestItemConverter {
    private static final SecureRandom RANDOM = new SecureRandom();
    private static final int TRACKING_TOKEN_BYTES = 32;

    private RepairRequestItemConverter() {
    }

    public static Map<String, AttributeValue> toItem(final SubmitRepairRequestDto submitRepairRequestDto, ObjectMapper objectMapper) throws JsonProcessingException {
        var timeSlots = submitRepairRequestDto.timeSlots()
                .stream()
                .map(PreferredVisitWindow::from)
                .toList();
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("id", stringAttribute(UUID.randomUUID().toString()));
        item.put("dummyPartitionKey", stringAttribute("DUMMY"));
        if (submitRepairRequestDto.vin() != null) {
            item.put("vin", stringAttribute(submitRepairRequestDto.vin()));
        }
        item.put("plate_number", stringAttribute(submitRepairRequestDto.plateNumber()));
        item.put("issue_description", stringAttribute(submitRepairRequestDto.issueDescription()));
        item.put("submitter_first_name", stringAttribute(submitRepairRequestDto.firstName()));
        item.put("submitter_last_name", stringAttribute(submitRepairRequestDto.lastName()));
        item.put("email", stringAttribute(submitRepairRequestDto.email()));
        item.put("phone_number", stringAttribute(submitRepairRequestDto.phoneNumber()));
        item.put("asap", numberAttribute(submitRepairRequestDto.asap()));
        item.put("rodo", numberAttribute(submitRepairRequestDto.rodo()));
        // review_email_sent_at is deliberately not written here - only the shop monolith sets it,
        // when the post-visit review e-mail is actually sent at close time.
        item.put("review_email_consent", numberAttribute(submitRepairRequestDto.reviewEmailConsent()));
        item.put("submittedAt", stringAttribute(ZonedDateTime.now(ZoneId.of("UTC")).toLocalDateTime().toString()));
        item.put("status_value", stringAttribute("NEW"));
        // secret for the customer's status link - mirrors shop's TrackingToken.generate()
        item.put("tracking_token", stringAttribute(generateTrackingToken()));
        item.put("preferred_visit_windows", stringAttribute(objectMapper.writeValueAsString(timeSlots)));
        return item;
    }

    static String generateTrackingToken() {
        byte[] bytes = new byte[TRACKING_TOKEN_BYTES];
        RANDOM.nextBytes(bytes);
        return Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
    }

    private static AttributeValue stringAttribute(String value) {
        return AttributeValue.builder().s(value).build();
    }

    private static AttributeValue numberAttribute(boolean value) {
        return AttributeValue.builder().n(value ? "1" : "0").build();
    }
}
