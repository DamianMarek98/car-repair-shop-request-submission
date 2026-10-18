package car.repair.shop.team;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class EmployeeIntegrationTest extends TeamIntegrationTest {
    private static final String EMPLOYEES = "/api/internal/team/employees";

    @Autowired
    private MockMvc mvc;

    @Autowired
    private ObjectMapper objectMapper;

    @Test
    void withoutUser_isUnauthorized() throws Exception {
        mvc.perform(get(EMPLOYEES)).andExpect(status().isUnauthorized());
    }

    @Test
    void create_returnsEmployeeWithDefaultPoolAndFullBalance() throws Exception {
        mvc.perform(post(EMPLOYEES).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"  Tomasz \",\"lastName\":\"Nowak\"}"))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.id").isNotEmpty())
                .andExpect(jsonPath("$.firstName").value("Tomasz"))
                .andExpect(jsonPath("$.defaultAnnualDays").value(26))
                .andExpect(jsonPath("$.colorIndex").value(0))
                .andExpect(jsonPath("$.balance.year").value(2026))
                .andExpect(jsonPath("$.balance.pool").value(26))
                .andExpect(jsonPath("$.balance.poolIsDefault").value(true))
                .andExpect(jsonPath("$.balance.taken").value(0))
                .andExpect(jsonPath("$.balance.planned").value(0))
                .andExpect(jsonPath("$.balance.remaining").value(26));
    }

    @Test
    void list_returnsBackendTodayYearsAndEmployeesSortedByLastName() throws Exception {
        createEmployee("Katarzyna", "Wiśniewska", 26);
        createEmployee("Agnieszka", "Dąbrowska", 20);

        mvc.perform(get(EMPLOYEES).param("year", "2026").with(user("test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.today").value("2026-11-02"))
                .andExpect(jsonPath("$.year").value(2026))
                .andExpect(jsonPath("$.availableYears", contains(2026, 2027)))
                .andExpect(jsonPath("$.employees[0].lastName").value("Dąbrowska"))
                .andExpect(jsonPath("$.employees[0].balance.pool").value(20))
                .andExpect(jsonPath("$.employees[1].lastName").value("Wiśniewska"));
    }

    @Test
    void list_withoutYear_usesCurrentYear() throws Exception {
        mvc.perform(get(EMPLOYEES).with(user("test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.year").value(2026));
    }

    @Test
    void list_availableYearsStartAtEarliestLeave() throws Exception {
        var id = createEmployee("Marek", "Zieliński", 20);
        saveLeave(id, "2024-07-08", "2024-07-12");

        mvc.perform(get(EMPLOYEES).with(user("test")))
                .andExpect(jsonPath("$.availableYears", contains(2024, 2025, 2026, 2027)));
    }

    @Test
    void list_balanceCountsTakenAndPlannedForSelectedYear() throws Exception {
        var id = createEmployee("Marek", "Zieliński", 20);
        saveLeave(id, "2026-10-28", "2026-11-06");

        mvc.perform(get(EMPLOYEES).param("year", "2026").with(user("test")))
                .andExpect(jsonPath("$.employees[0].balance.taken").value(3))
                .andExpect(jsonPath("$.employees[0].balance.planned").value(5))
                .andExpect(jsonPath("$.employees[0].balance.remaining").value(12));
    }

    @Test
    void update_changesNames() throws Exception {
        var id = createEmployee("Tomasz", "Nowak", 26);

        mvc.perform(put(EMPLOYEES + "/{id}", id).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Tomek\",\"lastName\":\"Nowak-Kowalski\"}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.firstName").value("Tomek"))
                .andExpect(jsonPath("$.lastName").value("Nowak-Kowalski"))
                .andExpect(jsonPath("$.defaultAnnualDays").value(26));
    }

    @Test
    void setPool_thenClear_fallsBackToDefault() throws Exception {
        var id = createEmployee("Tomasz", "Nowak", 26);

        mvc.perform(put(EMPLOYEES + "/{id}/pool/{year}", id, 2026).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":9}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance.pool").value(9))
                .andExpect(jsonPath("$.balance.poolIsDefault").value(false));

        mvc.perform(put(EMPLOYEES + "/{id}/pool/{year}", id, 2026).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":null}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.balance.pool").value(26))
                .andExpect(jsonPath("$.balance.poolIsDefault").value(true));
    }

    @Test
    void setPool_forNextYear_returnsThatYearsBalance() throws Exception {
        var id = createEmployee("Tomasz", "Nowak", 26);

        mvc.perform(put(EMPLOYEES + "/{id}/pool/{year}", id, 2027).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":30}"))
                .andExpect(jsonPath("$.balance.year").value(2027))
                .andExpect(jsonPath("$.balance.pool").value(30));
    }

    @Test
    void invalidPool_isRejectedWithCode() throws Exception {
        var id = createEmployee("Tomasz", "Nowak", 26);

        mvc.perform(put(EMPLOYEES + "/{id}/pool/{year}", id, 2026).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"days\":366}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_POOL"));

        mvc.perform(post(EMPLOYEES).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Jan\",\"lastName\":\"Testowy\",\"defaultAnnualDays\":-1}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_POOL"));
    }

    @Test
    void emptyName_isRejectedWithCode() throws Exception {
        mvc.perform(post(EMPLOYEES).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"   \",\"lastName\":\"Nowak\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_NAME"))
                .andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test
    void invalidYear_isRejectedWithCode() throws Exception {
        mvc.perform(get(EMPLOYEES).param("year", "abc").with(user("test")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_YEAR"));
    }

    @Test
    void unknownEmployee_isNotFoundWithCode() throws Exception {
        mvc.perform(put(EMPLOYEES + "/{id}", "missing").with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Jan\",\"lastName\":\"Testowy\"}"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EMPLOYEE_NOT_FOUND"));

        mvc.perform(delete(EMPLOYEES + "/{id}", "missing").with(user("test")))
                .andExpect(status().isNotFound());
    }

    @Test
    void changingDefault_keepsPastYearWithLeaveAtOldValue() throws Exception {
        var id = createEmployee("Katarzyna", "Wiśniewska", 26);
        saveLeave(id, "2026-10-19", "2026-10-23");

        mvc.perform(put(EMPLOYEES + "/{id}", id).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Katarzyna\",\"lastName\":\"Wiśniewska\",\"defaultAnnualDays\":20}"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.defaultAnnualDays").value(20));

        mvc.perform(get(EMPLOYEES).param("year", "2026").with(user("test")))
                .andExpect(jsonPath("$.employees[0].balance.pool").value(26))
                .andExpect(jsonPath("$.employees[0].balance.poolIsDefault").value(false))
                .andExpect(jsonPath("$.employees[0].balance.remaining").value(21));
        mvc.perform(get(EMPLOYEES).param("year", "2027").with(user("test")))
                .andExpect(jsonPath("$.employees[0].balance.pool").value(20))
                .andExpect(jsonPath("$.employees[0].balance.poolIsDefault").value(true));
    }

    @Test
    void delete_removesEmployeeAndOnlyTheirLeave() throws Exception {
        var removed = createEmployee("Tomasz", "Nowak", 26);
        var kept = createEmployee("Piotr", "Kamiński", 26);
        saveLeave(removed, "2026-11-09", "2026-11-13");
        var keptLeave = saveLeave(kept, "2026-11-09", "2026-11-13");

        mvc.perform(delete(EMPLOYEES + "/{id}", removed).with(user("test")))
                .andExpect(status().isNoContent());

        assertThat(employeeRepository.findById(removed)).isEmpty();
        assertThat(employeeRepository.findById(kept)).isPresent();
        assertThat(leaveRepository.findAll()).extracting(Leave::getId).containsExactly(keptLeave);
    }

    @Test
    void colorIndex_reusesFreedIndex() throws Exception {
        var first = createEmployee("Tomasz", "Nowak", 26);
        createEmployee("Piotr", "Kamiński", 26);

        mvc.perform(delete(EMPLOYEES + "/{id}", first).with(user("test")))
                .andExpect(status().isNoContent());

        mvc.perform(post(EMPLOYEES).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"firstName\":\"Jan\",\"lastName\":\"Testowy\"}"))
                .andExpect(jsonPath("$.colorIndex").value(0));
    }

    private String createEmployee(String firstName, String lastName, int defaultDays) throws Exception {
        var body = objectMapper.writeValueAsString(Map.of(
                "firstName", firstName, "lastName", lastName, "defaultAnnualDays", defaultDays));
        var response = mvc.perform(post(EMPLOYEES).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isCreated())
                .andReturn().getResponse().getContentAsString();
        return objectMapper.readTree(response).get("id").asText();
    }

    /** Leave endpoints arrive in phase 2 - until then leave rows are written straight to the table. */
    private String saveLeave(String employeeId, String start, String end) {
        var leave = new Leave();
        leave.setEmployeeId(employeeId);
        leave.setStartDate(LocalDate.parse(start));
        leave.setEndDate(LocalDate.parse(end));
        return leaveRepository.save(leave).getId();
    }
}
