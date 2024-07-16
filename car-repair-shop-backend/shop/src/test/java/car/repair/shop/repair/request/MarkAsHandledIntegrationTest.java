package car.repair.shop.repair.request;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.EnumSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;
import java.util.Optional;

import static car.repair.shop.repair.request.RepairRequestStatus.HANDLED;
import static car.repair.shop.repair.request.RepairRequestStatus.NEW;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class MarkAsHandledIntegrationTest extends RepairRequestIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private RepairRequestRepository repairRequestRepository;

    @Test
    void shouldReturn404NotFoundWhenNoRepairRequestWithGivenId() throws Exception {
        mvc.perform(post("/api/internal/repair-request/{id}/mark-as-handled", "test id")
                        .with(user("test")))
                .andExpect(status().isNotFound());
    }

    @ParameterizedTest
    @EnumSource(value = RepairRequestStatus.class, names = {"HANDLED", "APPOINTMENT_MADE"})
    void shouldReturnForbiddenWhenWrongState(RepairRequestStatus status) throws Exception {
        PreferredVisitWindow preferredVisitWindow = new PreferredVisitWindow(LocalDate.now(), LocalTime.NOON, LocalTime.MAX);
        var repairRequest = repairRequestRepository.save(new RepairRequestBuilder()
                .withVin("4Y1SL65848Z411439")
                .withIssueDescription("test")
                .withEmail("test@test.com")
                .withFirstName("Damian")
                .withLastName("Marek")
                .withPreferredVisitWindows(List.of(preferredVisitWindow))
                .withPhoneNumber("111222333")
                .withStatus(status)
                .asap()
                .build());

        mvc.perform(post("/api/internal/repair-request/{id}/mark-as-handled", repairRequest.getId())
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
                .withStatus(NEW)
                .asap()
                .build());

        mvc.perform(post("/api/internal/repair-request/{id}/mark-as-handled", repairRequest.getId())
                        .with(user("test")))
                .andExpect(status().isOk());

        Optional<RepairRequest> repairRequestAfterOperation = repairRequestRepository.findById(repairRequest.getId());
        assertThat(repairRequestAfterOperation).isPresent();
        assertThat(repairRequestAfterOperation.get().getStatus()).isEqualTo(HANDLED);
        assertThat(repairRequestAfterOperation.get().getHandledAt()).isNotNull();
    }
}
