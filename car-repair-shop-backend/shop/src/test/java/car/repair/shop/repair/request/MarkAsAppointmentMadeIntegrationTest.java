package car.repair.shop.repair.request;

import car.repair.shop.notification.NotificationFacade;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static car.repair.shop.repair.request.RepairRequestStatus.APPOINTMENT_MADE;
import static car.repair.shop.repair.request.RepairRequestStatus.HANDLED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class MarkAsAppointmentMadeIntegrationTest extends RepairRequestIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private RepairRequestRepository repairRequestRepository;

    @MockBean
    private NotificationFacade notificationFacade;

    @BeforeEach
    void resetNotificationFacade() {
        reset(notificationFacade);
    }

    @Test
    void shouldReturn404NotFoundWhenNoRepairRequestWithGivenId() throws Exception {
        mvc.perform(post("/api/internal/repair-request/{id}/mark-as-appointment-made", "test id")
                        .with(user("test")))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnForbiddenWhenWrongState() throws Exception {
        PreferredVisitWindow preferredVisitWindow = new PreferredVisitWindow(LocalDate.now(), LocalTime.NOON, LocalTime.MAX);
        var repairRequest = repairRequestRepository.save(new RepairRequestBuilder()
                .withVin("4Y1SL65848Z411439")
                .withIssueDescription("test")
                .withEmail("test@test.com")
                .withFirstName("Damian")
                .withLastName("Marek")
                .withPreferredVisitWindows(List.of(preferredVisitWindow))
                .withPhoneNumber("111222333")
                .withStatus(APPOINTMENT_MADE)
                .withReviewEmailConsent()
                .asap()
                .build());

        mvc.perform(post("/api/internal/repair-request/{id}/mark-as-appointment-made", repairRequest.getId())
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sendReviewEmail\":true}"))
                .andExpect(status().isForbidden());

        // an already-closed request must not produce a second e-mail
        verify(notificationFacade, never()).sendReviewRequestEmail(anyString(), any());
    }

    @Test
    void shouldMarkRepairRequestAsHandled() throws Exception {
        PreferredVisitWindow preferredVisitWindow = new PreferredVisitWindow(LocalDate.now(), LocalTime.NOON, LocalTime.MAX);
        var repairRequest = repairRequestRepository.save(new RepairRequestBuilder()
                .withVin("4Y1SL65848Z411439")
                .withIssueDescription("test")
                .withEmail("test@test.com")
                .withFirstName("Damian")
                .withLastName("Marek")
                .withPreferredVisitWindows(List.of(preferredVisitWindow))
                .withPhoneNumber("111222333")
                .withStatus(HANDLED)
                .asap()
                .build());

        mvc.perform(post("/api/internal/repair-request/{id}/mark-as-appointment-made", repairRequest.getId())
                        .with(user("test")))
                .andExpect(status().isOk());

        Optional<RepairRequest> repairRequestAfterOperation = repairRequestRepository.findById(repairRequest.getId());
        assertThat(repairRequestAfterOperation).isPresent();
        assertThat(repairRequestAfterOperation.get().getStatus()).isEqualTo(APPOINTMENT_MADE);
    }

    @Test
    void givenConsentAndRequestedSend_shouldSendReviewEmailAndRecordSentAt() throws Exception {
        when(notificationFacade.sendReviewRequestEmail("test@test.com", "Damian")).thenReturn(true);
        var repairRequest = repairRequestRepository.save(closableRequestBuilder()
                .withReviewEmailConsent()
                .build());

        mvc.perform(post("/api/internal/repair-request/{id}/mark-as-appointment-made", repairRequest.getId())
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sendReviewEmail\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.status").value("APPOINTMENT_MADE"))
                .andExpect(jsonPath("$.reviewEmailSent").value(true));

        verify(notificationFacade).sendReviewRequestEmail("test@test.com", "Damian");

        var afterOperation = repairRequestRepository.findById(repairRequest.getId()).orElseThrow();
        assertThat(afterOperation.getStatus()).isEqualTo(APPOINTMENT_MADE);
        assertThat(afterOperation.getReviewEmailSentAt()).isNotNull();
    }

    @Test
    void givenNoConsent_shouldNotSendReviewEmailEvenWhenRequested() throws Exception {
        var repairRequest = repairRequestRepository.save(closableRequestBuilder().build());

        mvc.perform(post("/api/internal/repair-request/{id}/mark-as-appointment-made", repairRequest.getId())
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sendReviewEmail\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewEmailSent").value(false));

        verify(notificationFacade, never()).sendReviewRequestEmail(anyString(), any());

        var afterOperation = repairRequestRepository.findById(repairRequest.getId()).orElseThrow();
        assertThat(afterOperation.getStatus()).isEqualTo(APPOINTMENT_MADE);
        assertThat(afterOperation.getReviewEmailSentAt()).isNull();
    }

    @Test
    void givenConsentButSendNotRequested_shouldOnlyChangeStatus() throws Exception {
        var repairRequest = repairRequestRepository.save(closableRequestBuilder()
                .withReviewEmailConsent()
                .build());

        mvc.perform(post("/api/internal/repair-request/{id}/mark-as-appointment-made", repairRequest.getId())
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sendReviewEmail\":false}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewEmailSent").value(false));

        verify(notificationFacade, never()).sendReviewRequestEmail(anyString(), any());
        assertThat(repairRequestRepository.findById(repairRequest.getId()).orElseThrow().getStatus())
                .isEqualTo(APPOINTMENT_MADE);
    }

    @Test
    void givenEmptyJsonBody_shouldCloseWithoutSendingEmail() throws Exception {
        var repairRequest = repairRequestRepository.save(closableRequestBuilder()
                .withReviewEmailConsent()
                .build());

        mvc.perform(post("/api/internal/repair-request/{id}/mark-as-appointment-made", repairRequest.getId())
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewEmailSent").value(false));

        verify(notificationFacade, never()).sendReviewRequestEmail(anyString(), any());
        assertThat(repairRequestRepository.findById(repairRequest.getId()).orElseThrow().getStatus())
                .isEqualTo(APPOINTMENT_MADE);
    }

    @Test
    void givenNoRequestBody_shouldCloseWithoutSendingEmail() throws Exception {
        var repairRequest = repairRequestRepository.save(closableRequestBuilder()
                .withReviewEmailConsent()
                .build());

        mvc.perform(post("/api/internal/repair-request/{id}/mark-as-appointment-made", repairRequest.getId())
                        .with(user("test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewEmailSent").value(false));

        verify(notificationFacade, never()).sendReviewRequestEmail(anyString(), any());
        assertThat(repairRequestRepository.findById(repairRequest.getId()).orElseThrow().getStatus())
                .isEqualTo(APPOINTMENT_MADE);
    }

    @Test
    void givenBlankEmailAddress_shouldCloseWithoutSendingEmail() throws Exception {
        var repairRequest = repairRequestRepository.save(closableRequestBuilder()
                .withEmail("  ")
                .withReviewEmailConsent()
                .build());

        mvc.perform(post("/api/internal/repair-request/{id}/mark-as-appointment-made", repairRequest.getId())
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sendReviewEmail\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewEmailSent").value(false));

        verify(notificationFacade, never()).sendReviewRequestEmail(anyString(), any());
        assertThat(repairRequestRepository.findById(repairRequest.getId()).orElseThrow().getStatus())
                .isEqualTo(APPOINTMENT_MADE);
    }

    @Test
    void givenFailedSend_shouldStillCloseAndReportFailure() throws Exception {
        when(notificationFacade.sendReviewRequestEmail(anyString(), any())).thenReturn(false);
        var repairRequest = repairRequestRepository.save(closableRequestBuilder()
                .withReviewEmailConsent()
                .build());

        mvc.perform(post("/api/internal/repair-request/{id}/mark-as-appointment-made", repairRequest.getId())
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"sendReviewEmail\":true}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.reviewEmailSent").value(false));

        var afterOperation = repairRequestRepository.findById(repairRequest.getId()).orElseThrow();
        assertThat(afterOperation.getStatus()).isEqualTo(APPOINTMENT_MADE);
        assertThat(afterOperation.getReviewEmailSentAt()).isNull();
    }

    private RepairRequestBuilder closableRequestBuilder() {
        return new RepairRequestBuilder()
                .withVin("4Y1SL65848Z411439")
                .withIssueDescription("test")
                .withEmail("test@test.com")
                .withFirstName("Damian")
                .withLastName("Marek")
                .withEmptyPreferredVisitWindows()
                .withPhoneNumber("111222333")
                .withStatus(HANDLED)
                .withRodoApproval()
                .asap();
    }
}
