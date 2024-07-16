package car.repair.shop.repair.request;

import car.repair.shop.repair.request.controller.dto.RepairRequestDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.content;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class GetRepairRequestIntegrationTest extends RepairRequestIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private RepairRequestRepository repairRequestRepository;

    @Autowired
    private ObjectMapper objectMapper;


    @Test
    void shouldReturn404NotFoundWhenNoRepairRequestWithGivenId() throws Exception {
        mvc.perform(get("/api/internal/repair-request/{id}", "test id")
                        .with(user("test")))
                .andExpect(status().isNotFound());
    }

    @Test
    void shouldReturnRepairRequest() throws Exception {
        PreferredVisitWindow preferredVisitWindow = new PreferredVisitWindow(LocalDate.now(), LocalTime.NOON, LocalTime.MAX);
        var repairRequest = repairRequestRepository.save(new RepairRequestBuilder()
                .withVin("4Y1SL65848Z411439")
                .withIssueDescription("test")
                .withEmail("test@test.com")
                .withFirstName("Damian")
                .withLastName("Marek")
                .withPreferredVisitWindows(List.of(preferredVisitWindow))
                .withPhoneNumber("111222333")
                .asap()
                .build());

        mvc.perform(get("/api/internal/repair-request/{id}", repairRequest.getId()).with(user("test")))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON))
                .andExpect(result -> {
                    String json = result.getResponse().getContentAsString();
                    var repairRequestDto = objectMapper.readValue(json, RepairRequestDto.class);
                    Assertions.assertNotNull(repairRequestDto.id());
                    Assertions.assertEquals(repairRequest.getVin(), repairRequestDto.vin());
                    Assertions.assertEquals(repairRequest.getIssueDescription(), repairRequestDto.issueDescription());
                    Assertions.assertEquals(repairRequest.getEmail(), repairRequestDto.email());
                    Assertions.assertEquals(repairRequest.getSubmitterFirstName(), repairRequestDto.submitterFirstName());
                    Assertions.assertEquals(repairRequest.getSubmitterLastName(), repairRequestDto.submitterLastName());
                    Assertions.assertEquals(repairRequest.getPhoneNumber(), repairRequestDto.phoneNumber());
                    Assertions.assertEquals(1, repairRequestDto.preferredVisitWindows().size());
                    PreferredVisitWindow preferredVisitWindow1 = repairRequest.getPreferredVisitWindows().get(0);
                    Assertions.assertEquals(preferredVisitWindow.date(), preferredVisitWindow1.date());
                    Assertions.assertEquals(preferredVisitWindow.from(), preferredVisitWindow1.from());
                    Assertions.assertEquals(preferredVisitWindow.to(), preferredVisitWindow1.to());
                    Assertions.assertTrue(repairRequestDto.asap());
                });
    }
}
