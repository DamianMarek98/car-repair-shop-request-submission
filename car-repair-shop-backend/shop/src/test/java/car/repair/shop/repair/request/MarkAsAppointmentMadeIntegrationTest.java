package car.repair.shop.repair.request;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static car.repair.shop.repair.request.RepairRequestStatus.APPOINTMENT_MADE;
import static car.repair.shop.repair.request.RepairRequestStatus.HANDLED;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class MarkAsAppointmentMadeIntegrationTest extends RepairRequestIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private RepairRequestRepository repairRequestRepository;

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
                .asap()
                .build());

        mvc.perform(post("/api/internal/repair-request/{id}/mark-as-appointment-made", repairRequest.getId())
                        .with(user("test")))
                .andExpect(status().isForbidden());
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


}
