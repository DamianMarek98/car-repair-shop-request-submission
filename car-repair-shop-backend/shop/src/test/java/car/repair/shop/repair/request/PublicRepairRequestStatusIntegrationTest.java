package car.repair.shop.repair.request;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.HttpHeaders;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;

import static car.repair.shop.repair.request.RepairRequestStatus.APPOINTMENT_MADE;
import static car.repair.shop.repair.request.RepairRequestStatus.HANDLED;
import static car.repair.shop.repair.request.RepairRequestStatus.NEW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

/**
 * The status endpoint is public: no request here carries a user, on purpose.
 */
@AutoConfigureMockMvc
class PublicRepairRequestStatusIntegrationTest extends RepairRequestIntegrationTest {
    private static final String STATUS_URL = "/api/public/repair-request/status/{token}";
    private static final String VIN = "4Y1SL65848Z411439";
    private static final String PHONE_NUMBER = "111222567";
    private static final String EMAIL = "anna.nowak@example.com";
    private static final String LAST_NAME = "Nowakowska";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private RepairRequestRepository repairRequestRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void shouldReturnNewRepairRequestWithMaskedPersonalData() throws Exception {
        var repairRequest = repairRequestRepository.save(repairRequest(NEW));

        mvc.perform(get(STATUS_URL, repairRequest.getTrackingToken()))
                .andExpect(status().isOk())
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andExpect(jsonPath("$.status").value("NEW"))
                .andExpect(jsonPath("$.submitterFirstName").value("Anna"))
                .andExpect(jsonPath("$.plateNumber").value("GD12345"))
                .andExpect(jsonPath("$.vin").value("***…11439"))
                .andExpect(jsonPath("$.phoneNumber").value("••• ••• 567"))
                .andExpect(jsonPath("$.email").value("a••••@example.com"))
                .andExpect(jsonPath("$.issueDescription").value("Stuka zawieszenie"))
                .andExpect(jsonPath("$.asap").value(false))
                .andExpect(jsonPath("$.preferredVisitWindows.length()").value(2))
                // sorted by date, like the admin view
                .andExpect(jsonPath("$.preferredVisitWindows[0].date").value("2026-11-02"))
                .andExpect(jsonPath("$.preferredVisitWindows[0].from").value("09:00:00"))
                .andExpect(jsonPath("$.preferredVisitWindows[1].date").value("2026-11-03"))
                .andExpect(jsonPath("$.submittedAt").value("2026-10-01T08:15:30"))
                .andExpect(jsonPath("$.appointmentAt").value(nullValue()))
                .andExpect(jsonPath("$.completedAt").value(nullValue()));
    }

    @Test
    void shouldReturnBookedRepairRequestWithAppointment() throws Exception {
        var repairRequest = repairRequest(HANDLED);
        repairRequest.setAppointmentAt(LocalDateTime.of(2026, 11, 2, 8, 30));
        repairRequest = repairRequestRepository.save(repairRequest);

        mvc.perform(get(STATUS_URL, repairRequest.getTrackingToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("HANDLED"))
                .andExpect(jsonPath("$.appointmentAt").value("2026-11-02T08:30:00"))
                .andExpect(jsonPath("$.completedAt").value(nullValue()));
    }

    @Test
    void shouldReturnCompletedRepairRequest() throws Exception {
        var completedAt = LocalDateTime.now(ZoneOffset.UTC).minusDays(89).withNano(0);
        var repairRequest = repairRequest(APPOINTMENT_MADE);
        repairRequest.setAppointmentAt(LocalDateTime.of(2026, 7, 1, 8, 30));
        repairRequest.setCompletedAt(completedAt);
        repairRequest = repairRequestRepository.save(repairRequest);

        var body = mvc.perform(get(STATUS_URL, repairRequest.getTrackingToken()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPOINTMENT_MADE"))
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(LocalDateTime.parse(objectMapper.readTree(body).get("completedAt").asText())).isEqualTo(completedAt);
    }

    @Test
    void shouldNotLeakPersonalDataOrIdentifiers() throws Exception {
        var repairRequest = repairRequest(HANDLED);
        repairRequest.setAppointmentAt(LocalDateTime.of(2026, 11, 2, 8, 30));
        repairRequest.setHandledAt(LocalDateTime.of(2026, 10, 2, 9, 0));
        repairRequest = repairRequestRepository.save(repairRequest);

        var body = mvc.perform(get(STATUS_URL, repairRequest.getTrackingToken()))
                .andExpect(status().isOk())
                .andReturn().getResponse().getContentAsString(StandardCharsets.UTF_8);

        assertThat(body).contains("***…11439", "••• ••• 567", "a••••@example.com");
        assertThat(body).doesNotContain(VIN, PHONE_NUMBER, EMAIL, "anna.nowak", LAST_NAME,
                repairRequest.getId(), repairRequest.getTrackingToken());

        // an allowlist: a new field in the response has to be added here deliberately
        List<String> fields = new ArrayList<>();
        objectMapper.readTree(body).fieldNames().forEachRemaining(fields::add);
        assertThat(fields).containsExactlyInAnyOrder("status", "submitterFirstName", "plateNumber", "vin",
                "phoneNumber", "email", "issueDescription", "asap", "preferredVisitWindows", "submittedAt",
                "appointmentAt", "completedAt");
    }

    @Test
    void unknownMalformedAndExpiredTokensShouldBeIndistinguishable() throws Exception {
        var expired = repairRequest(APPOINTMENT_MADE);
        expired.setCompletedAt(LocalDateTime.now(ZoneOffset.UTC).minusDays(91));
        expired = repairRequestRepository.save(expired);

        var unknown = notFound(TrackingToken.generate());
        var tooShort = notFound("abc");
        var illegalChars = notFound("dvzTfzj-OGLRtfQr_1pw6R7dtfdOkt033kLcIVfBRS!");
        var expiredResponse = notFound(expired.getTrackingToken());

        assertThat(unknown.getResponse().getContentAsString(StandardCharsets.UTF_8)).isEqualTo("{\"message\":\"Not found\"}");
        for (var other : List.of(tooShort, illegalChars, expiredResponse)) {
            assertThat(other.getResponse().getContentAsByteArray()).isEqualTo(unknown.getResponse().getContentAsByteArray());
            assertThat(other.getResponse().getContentType()).isEqualTo(unknown.getResponse().getContentType());
            assertThat(other.getResponse().getHeader(HttpHeaders.CACHE_CONTROL))
                    .isEqualTo(unknown.getResponse().getHeader(HttpHeaders.CACHE_CONTROL));
        }
    }

    @Test
    void requestIdShouldNotWorkAsToken() throws Exception {
        var repairRequest = repairRequestRepository.save(repairRequest(NEW));

        notFound(repairRequest.getId());
    }

    @Test
    void internalApiShouldStillRequireAuthentication() throws Exception {
        var repairRequest = repairRequestRepository.save(repairRequest(NEW));

        mvc.perform(get("/api/internal/repair-request/{id}", repairRequest.getId()))
                .andExpect(status().isUnauthorized());
    }

    private MvcResult notFound(String token) throws Exception {
        return mvc.perform(get(STATUS_URL, token))
                .andExpect(status().isNotFound())
                .andExpect(header().string(HttpHeaders.CONTENT_TYPE, "application/json"))
                .andExpect(header().string(HttpHeaders.CACHE_CONTROL, "no-store"))
                .andReturn();
    }

    private static Object nullValue() {
        return null;
    }

    private static RepairRequest repairRequest(RepairRequestStatus status) {
        var repairRequest = new RepairRequestBuilder()
                .withVin(VIN)
                .withPlateNumber("GD12345")
                .withIssueDescription("Stuka zawieszenie")
                .withEmail(EMAIL)
                .withFirstName("Anna")
                .withLastName(LAST_NAME)
                .withPreferredVisitWindows(List.of(
                        new PreferredVisitWindow(LocalDate.of(2026, 11, 3), LocalTime.of(10, 0), LocalTime.of(14, 0)),
                        new PreferredVisitWindow(LocalDate.of(2026, 11, 2), LocalTime.of(9, 0), LocalTime.of(12, 0))))
                .withPhoneNumber(PHONE_NUMBER)
                .withStatus(status)
                .withTrackingToken(TrackingToken.generate())
                .withRodoApproval()
                .build();
        repairRequest.setSubmittedAt(LocalDateTime.of(2026, 10, 1, 8, 15, 30));
        return repairRequest;
    }
}
