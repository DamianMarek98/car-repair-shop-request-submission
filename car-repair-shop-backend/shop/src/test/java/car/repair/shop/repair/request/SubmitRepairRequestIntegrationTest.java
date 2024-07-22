package car.repair.shop.repair.request;

import car.repair.shop.repair.request.controller.dto.SubmitRepairRequestDto;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class SubmitRepairRequestIntegrationTest extends RepairRequestIntegrationTest {

    @Autowired
    private MockMvc mvc;

    @Autowired
    private RepairRequestRepository repairRequestRepository;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void givenValidRequest_shouldCreateRepairRequest() throws Exception {
        repairRequestRepository.deleteAll();
        SubmitRepairRequestDto.TimeSlotDto timeSlot = new SubmitRepairRequestDto.TimeSlotDto(LocalDate.now(), LocalTime.NOON, LocalTime.MAX);
        var request = new SubmitRepairRequestDtoBuilder()
                .withVin("4Y1SL65848Z411439")
                .withIssueDescription("test")
                .withEmail("test@test.com")
                .withFirstName("Damian")
                .withLastName("Marek")
                .withTimeSlots(List.of(timeSlot))
                .withPhoneNumber("111222333")
                .asap()
                .withRodoApproval()
                .build();
        mvc.perform(post("/api/repair-request/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated());

        var result = repairRequestRepository.findAll().iterator().next();
        assertNotNull(result);
        assertNotNull(result.getId());
        assertThat(result.getVin()).isEqualTo(request.vin());
        assertNull(result.getPlateNumber());
        assertThat(result.getIssueDescription()).isEqualTo(request.issueDescription());
        assertThat(result.getSubmitterFirstName()).isEqualTo(request.firstName());
        assertThat(result.getSubmitterLastName()).isEqualTo(request.lastName());
        assertThat(result.getPhoneNumber()).isEqualTo(request.phoneNumber());
        assertThat(result.getEmail()).isEqualTo(request.email());
        assertThat(result.getPreferredVisitWindows()).isNotEmpty();
        assertThat(result.isAsap()).isTrue();
        assertThat(result.isRodo()).isTrue();
        PreferredVisitWindow preferredVisitWindow = result.getPreferredVisitWindows().get(0);
        assertThat(preferredVisitWindow.date()).isEqualTo(timeSlot.date());
        assertThat(preferredVisitWindow.from()).isEqualTo(timeSlot.from());
        assertThat(preferredVisitWindow.to()).isEqualTo(timeSlot.to());
        assertNotNull(result.getSubmittedAt());
        assertNull(result.getHandledAt());
        assertThat(result.getStatus()).isEqualTo(RepairRequestStatus.NEW);
        repairRequestRepository.delete(result);
    }

    @Test
    void givenNotValidRequest_shouldReturnBadRequest() throws Exception {
        var request = new SubmitRepairRequestDtoBuilder()
                .withVin(null)
                .withPlateNumber(null)
                .withIssueDescription("test")
                .withEmail("test@test.com")
                .withFirstName("Damian")
                .withLastName("Marek")
                .withEmptyTimeSlots()
                .withPhoneNumber("111222333")
                .withRodoApproval()
                .build();
        mvc.perform(post("/api/repair-request/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }

    @Test
    void givenNoRodoApprovalInRequest_shouldReturnBadRequest() throws Exception {
        var request = new SubmitRepairRequestDtoBuilder()
                .withPlateNumber("GD12345")
                .withIssueDescription("test")
                .withEmail("test@test.com")
                .withFirstName("Damian")
                .withLastName("Marek")
                .withEmptyTimeSlots()
                .withPhoneNumber("111222333")
                .build();
        mvc.perform(post("/api/repair-request/submit")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest());
    }


    static class SubmitRepairRequestDtoBuilder {
        private String vin;
        private String plateNumber;
        private String issueDescription;
        private String firstName;
        private String lastName;
        private String email;
        private String phoneNumber;
        private List<SubmitRepairRequestDto.TimeSlotDto> timeSlots;
        private boolean asap;
        private boolean rodo;

        SubmitRepairRequestDtoBuilder withVin(String vin) {
            this.vin = vin;
            return this;
        }

        SubmitRepairRequestDtoBuilder withPlateNumber(String plateNumber) {
            this.plateNumber = plateNumber;
            return this;
        }

        SubmitRepairRequestDtoBuilder withIssueDescription(String issueDescription) {
            this.issueDescription = issueDescription;
            return this;
        }

        SubmitRepairRequestDtoBuilder withFirstName(String firstName) {
            this.firstName = firstName;
            return this;
        }

        SubmitRepairRequestDtoBuilder withLastName(String lastName) {
            this.lastName = lastName;
            return this;
        }

        SubmitRepairRequestDtoBuilder withEmail(String email) {
            this.email = email;
            return this;
        }

        SubmitRepairRequestDtoBuilder withPhoneNumber(String phoneNumber) {
            this.phoneNumber = phoneNumber;
            return this;
        }

        SubmitRepairRequestDtoBuilder withTimeSlots(List<SubmitRepairRequestDto.TimeSlotDto> timeSlots) {
            this.timeSlots = timeSlots;
            return this;
        }

        SubmitRepairRequestDtoBuilder withEmptyTimeSlots() {
            this.timeSlots = List.of();
            return this;
        }

        SubmitRepairRequestDtoBuilder asap() {
            this.asap = true;
            return this;
        }

        SubmitRepairRequestDtoBuilder withRodoApproval() {
            this.rodo = true;
            return this;
        }

        SubmitRepairRequestDto build() {
            return new SubmitRepairRequestDto(vin, plateNumber, issueDescription, firstName, lastName, email, phoneNumber, timeSlots, asap, rodo);
        }
    }
}
