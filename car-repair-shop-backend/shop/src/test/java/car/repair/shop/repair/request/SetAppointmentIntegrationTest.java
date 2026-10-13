package car.repair.shop.repair.request;

import car.repair.shop.availability.UnavailableDateDto;
import car.repair.shop.availability.UnavailableDayFacade;
import car.repair.shop.notification.NotificationFacade;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.ZoneId;
import java.time.ZoneOffset;
import java.util.List;
import java.util.Set;

import static car.repair.shop.repair.request.RepairRequestStatus.APPOINTMENT_MADE;
import static car.repair.shop.repair.request.RepairRequestStatus.HANDLED;
import static car.repair.shop.repair.request.RepairRequestStatus.NEW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.reset;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class SetAppointmentIntegrationTest extends RepairRequestIntegrationTest {
    private static final ZoneId SHOP_ZONE = ZoneId.of("Europe/Warsaw");
    // not looked up here, so sharing it between this class's requests is fine
    private static final String TRACKING_TOKEN = TrackingToken.generate();

    @Autowired
    private MockMvc mvc;

    @Autowired
    private RepairRequestRepository repairRequestRepository;

    @MockBean
    private NotificationFacade notificationFacade;

    @MockBean
    private UnavailableDayFacade unavailableDayFacade;

    @BeforeEach
    void resetMocks() {
        reset(notificationFacade, unavailableDayFacade);
        when(unavailableDayFacade.getAllUnavailableDays()).thenReturn(Set.of());
    }

    @Test
    void shouldReturn404NotFoundWhenNoRepairRequestWithGivenId() throws Exception {
        mvc.perform(post("/api/internal/repair-request/{id}/appointment", "test id")
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(nextWorkingDayUtc(LocalTime.of(9, 0)))))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnForbiddenWhenAppointmentAlreadyMade() throws Exception {
        var repairRequest = repairRequestRepository.save(repairRequestWithStatus(APPOINTMENT_MADE));

        mvc.perform(post("/api/internal/repair-request/{id}/appointment", repairRequest.getId())
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(nextWorkingDayUtc(LocalTime.of(9, 0)))))
                .andExpect(status().isForbidden());

        verify(notificationFacade, never()).sendAppointmentEmail(anyString(), any(), any(), anyBoolean(), any());
    }

    @Test
    void shouldBookAppointmentOnNewRepairRequestAndNotifyCustomer() throws Exception {
        var repairRequest = repairRequestRepository.save(repairRequestWithStatus(NEW));
        var appointmentAt = nextWorkingDayUtc(LocalTime.of(9, 0));

        mvc.perform(post("/api/internal/repair-request/{id}/appointment", repairRequest.getId())
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(appointmentAt)))
                .andExpect(status().isOk());

        var afterOperation = repairRequestRepository.findById(repairRequest.getId()).orElseThrow();
        assertThat(afterOperation.getStatus()).isEqualTo(HANDLED);
        assertThat(afterOperation.getHandledAt()).isNotNull();
        assertThat(afterOperation.getAppointmentAt()).isEqualTo(appointmentAt);
        verify(notificationFacade).sendAppointmentEmail("test@test.com", "Damian", appointmentAt, false, TRACKING_TOKEN);
    }

    @Test
    void shouldChangeAppointmentOnHandledRepairRequestAndNotifyCustomer() throws Exception {
        var repairRequest = repairRequestWithStatus(HANDLED);
        repairRequest.setAppointmentAt(nextWorkingDayUtc(LocalTime.of(9, 0)));
        repairRequest = repairRequestRepository.save(repairRequest);
        var newAppointmentAt = nextWorkingDayUtc(LocalTime.of(13, 45));

        mvc.perform(post("/api/internal/repair-request/{id}/appointment", repairRequest.getId())
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(newAppointmentAt)))
                .andExpect(status().isOk());

        var afterOperation = repairRequestRepository.findById(repairRequest.getId()).orElseThrow();
        assertThat(afterOperation.getStatus()).isEqualTo(HANDLED);
        assertThat(afterOperation.getAppointmentAt()).isEqualTo(newAppointmentAt);
        verify(notificationFacade).sendAppointmentEmail("test@test.com", "Damian", newAppointmentAt, true, TRACKING_TOKEN);
    }

    @Test
    void shouldNotNotifyCustomerWhenAppointmentIsUnchanged() throws Exception {
        var appointmentAt = nextWorkingDayUtc(LocalTime.of(9, 0));
        var repairRequest = repairRequestWithStatus(HANDLED);
        repairRequest.setAppointmentAt(appointmentAt);
        repairRequest = repairRequestRepository.save(repairRequest);

        mvc.perform(post("/api/internal/repair-request/{id}/appointment", repairRequest.getId())
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(appointmentAt)))
                .andExpect(status().isOk());

        verify(notificationFacade, never()).sendAppointmentEmail(anyString(), any(), any(), anyBoolean(), any());
    }

    @ParameterizedTest
    @ValueSource(strings = {"", "{}", "{\"appointmentAt\":null}", "{\"appointmentAt\":\"not a date\"}"})
    void shouldReturnBadRequestWhenAppointmentTimeMissingOrMalformed(String content) throws Exception {
        var repairRequest = repairRequestRepository.save(repairRequestWithStatus(NEW));

        mvc.perform(post("/api/internal/repair-request/{id}/appointment", repairRequest.getId())
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(content))
                .andExpect(status().isBadRequest());

        assertThat(repairRequestRepository.findById(repairRequest.getId()).orElseThrow().getStatus()).isEqualTo(NEW);
    }

    @Test
    void shouldReturnBadRequestWhenOutsideOpeningHours() throws Exception {
        var repairRequest = repairRequestRepository.save(repairRequestWithStatus(NEW));

        mvc.perform(post("/api/internal/repair-request/{id}/appointment", repairRequest.getId())
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(nextWorkingDayUtc(LocalTime.of(16, 30)))))
                .andExpect(status().isBadRequest());

        assertThat(repairRequestRepository.findById(repairRequest.getId()).orElseThrow().getStatus()).isEqualTo(NEW);
    }

    @Test
    void shouldReturnBadRequestWhenOnUnavailableDay() throws Exception {
        var repairRequest = repairRequestRepository.save(repairRequestWithStatus(NEW));
        var appointmentAt = nextWorkingDayUtc(LocalTime.of(9, 0));
        var localDate = appointmentAt.atOffset(ZoneOffset.UTC).atZoneSameInstant(SHOP_ZONE).toLocalDate();
        when(unavailableDayFacade.getAllUnavailableDays()).thenReturn(Set.of(new UnavailableDateDto("id", localDate)));

        mvc.perform(post("/api/internal/repair-request/{id}/appointment", repairRequest.getId())
                        .with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(appointmentAt)))
                .andExpect(status().isBadRequest());

        verify(notificationFacade, never()).sendAppointmentEmail(anyString(), any(), any(), anyBoolean(), any());
    }

    /** A working day a week ahead, at the given Warsaw local time, expressed in UTC. */
    private static LocalDateTime nextWorkingDayUtc(LocalTime localTime) {
        var date = LocalDate.now(SHOP_ZONE).plusDays(7);
        while (date.getDayOfWeek() == DayOfWeek.SATURDAY || date.getDayOfWeek() == DayOfWeek.SUNDAY) {
            date = date.plusDays(1);
        }
        return date.atTime(localTime).atZone(SHOP_ZONE).withZoneSameInstant(ZoneOffset.UTC).toLocalDateTime();
    }

    private static String body(LocalDateTime appointmentAt) {
        return "{\"appointmentAt\":\"" + appointmentAt + "\"}";
    }

    private static RepairRequest repairRequestWithStatus(RepairRequestStatus status) {
        return new RepairRequestBuilder()
                .withVin("4Y1SL65848Z411439")
                .withIssueDescription("test")
                .withEmail("test@test.com")
                .withFirstName("Damian")
                .withLastName("Marek")
                .withPreferredVisitWindows(List.of(new PreferredVisitWindow(LocalDate.now(), LocalTime.NOON, LocalTime.MAX)))
                .withPhoneNumber("111222333")
                .withStatus(status)
                .withTrackingToken(TRACKING_TOKEN)
                .asap()
                .build();
    }
}
