package car.repair.shop.team;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.empty;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class LeaveIntegrationTest extends TeamIntegrationTest {
    private static final String LEAVES = "/api/internal/team/leaves";

    @Autowired
    private MockMvc mvc;

    @Test
    void withoutUser_isUnauthorized() throws Exception {
        mvc.perform(get(LEAVES).param("from", "2026-11-01").param("to", "2026-11-30"))
                .andExpect(status().isUnauthorized());
    }

    @Test
    void create_returnsLeaveWithBalanceAndNoWarnings() throws Exception {
        var piotr = givenEmployee("Piotr", "Kamiński", 26, Map.of());

        mvc.perform(post(LEAVES).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(piotr.getId(), "2026-11-09", "2026-11-13")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.leave.id").isNotEmpty())
                .andExpect(jsonPath("$.leave.employeeId").value(piotr.getId()))
                .andExpect(jsonPath("$.leave.startDate").value("2026-11-09"))
                .andExpect(jsonPath("$.leave.workingDays").value(5))
                .andExpect(jsonPath("$.balance", hasSize(1)))
                .andExpect(jsonPath("$.balance[0].year").value(2026))
                .andExpect(jsonPath("$.balance[0].planned").value(5))
                .andExpect(jsonPath("$.balance[0].remaining").value(21))
                .andExpect(jsonPath("$.warnings", empty()));
    }

    @Test
    void create_overNewYear_splitsWorkingDaysAndReturnsBothYears() throws Exception {
        var tomasz = givenEmployee("Tomasz", "Nowak", 26, Map.of("2026", 9, "2027", 30));

        mvc.perform(post(LEAVES).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(tomasz.getId(), "2026-12-28", "2027-01-08")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.leave.workingDays").value(10))
                .andExpect(jsonPath("$.leave.workingDaysByYear.2026").value(4))
                .andExpect(jsonPath("$.leave.workingDaysByYear.2027").value(6))
                .andExpect(jsonPath("$.balance[0].year").value(2026))
                .andExpect(jsonPath("$.balance[0].remaining").value(5))
                .andExpect(jsonPath("$.balance[1].year").value(2027))
                .andExpect(jsonPath("$.balance[1].remaining").value(24));
    }

    @Test
    void overdraw_isSavedWithWarning() throws Exception {
        var joanna = givenEmployee("Joanna", "Lewandowska", 26, Map.of("2026", 3));

        mvc.perform(post(LEAVES).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(joanna.getId(), "2026-11-16", "2026-11-20")))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.warnings", hasSize(1)))
                .andExpect(jsonPath("$.warnings[0].code").value("POOL_EXCEEDED"))
                .andExpect(jsonPath("$.warnings[0].year").value(2026))
                .andExpect(jsonPath("$.warnings[0].remaining").value(-2));

        assertThat(leaveRepository.findAll()).hasSize(1);
    }

    @Test
    void overlap_isConflict() throws Exception {
        var piotr = givenEmployee("Piotr", "Kamiński", 26, Map.of());
        givenLeave(piotr, "2026-11-09", "2026-11-13");

        mvc.perform(post(LEAVES).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(piotr.getId(), "2026-11-12", "2026-11-12")))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.code").value("LEAVE_OVERLAP"));
    }

    @Test
    void weekendOnly_isUnprocessable() throws Exception {
        var piotr = givenEmployee("Piotr", "Kamiński", 26, Map.of());

        mvc.perform(post(LEAVES).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(piotr.getId(), "2026-11-14", "2026-11-15")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("NO_WORKING_DAYS"));
    }

    @Test
    void beyondNextYear_isTooFarAhead() throws Exception {
        var piotr = givenEmployee("Piotr", "Kamiński", 26, Map.of());

        mvc.perform(post(LEAVES).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(piotr.getId(), "2028-01-03", "2028-01-07")))
                .andExpect(status().isUnprocessableEntity())
                .andExpect(jsonPath("$.code").value("TOO_FAR_AHEAD"));
    }

    @Test
    void unknownEmployee_isNotFound() throws Exception {
        mvc.perform(post(LEAVES).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body("missing", "2026-11-09", "2026-11-13")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EMPLOYEE_NOT_FOUND"));
    }

    @Test
    void update_movesDates_andReturnsOldAndNewYears() throws Exception {
        var tomasz = givenEmployee("Tomasz", "Nowak", 26, Map.of("2026", 9, "2027", 30));
        var leave = givenLeave(tomasz, "2026-12-28", "2027-01-08");

        mvc.perform(put(LEAVES + "/{id}", leave.getId()).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(tomasz.getId(), "2026-12-28", "2026-12-31")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leave.endDate").value("2026-12-31"))
                .andExpect(jsonPath("$.balance", hasSize(2)))
                .andExpect(jsonPath("$.balance[1].year").value(2027))
                .andExpect(jsonPath("$.balance[1].planned").value(0))
                .andExpect(jsonPath("$.balance[1].remaining").value(30));
    }

    @Test
    void update_doesNotClashWithItself() throws Exception {
        var michal = givenEmployee("Michał", "Szymański", 26, Map.of());
        var leave = givenLeave(michal, "2026-11-16", "2026-11-20");

        mvc.perform(put(LEAVES + "/{id}", leave.getId()).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(null, "2026-11-16", "2026-11-18")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.leave.workingDays").value(3));
    }

    @Test
    void update_toAnotherEmployee_isRejected() throws Exception {
        var michal = givenEmployee("Michał", "Szymański", 26, Map.of());
        var piotr = givenEmployee("Piotr", "Kamiński", 26, Map.of());
        var leave = givenLeave(michal, "2026-11-16", "2026-11-20");

        mvc.perform(put(LEAVES + "/{id}", leave.getId()).with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(piotr.getId(), "2026-11-16", "2026-11-20")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("EMPLOYEE_CHANGE_NOT_ALLOWED"));
    }

    @Test
    void delete_removesLeave_andBalanceRecovers() throws Exception {
        var piotr = givenEmployee("Piotr", "Kamiński", 26, Map.of());
        var leave = givenLeave(piotr, "2026-11-09", "2026-11-13");

        mvc.perform(delete(LEAVES + "/{id}", leave.getId()).with(user("test")))
                .andExpect(status().isNoContent());

        mvc.perform(get("/api/internal/team/employees").param("year", "2026").with(user("test")))
                .andExpect(jsonPath("$.employees[0].balance.planned").value(0))
                .andExpect(jsonPath("$.employees[0].balance.remaining").value(26));
    }

    @Test
    void unknownLeave_isNotFound() throws Exception {
        mvc.perform(delete(LEAVES + "/{id}", "missing").with(user("test")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("LEAVE_NOT_FOUND"));
        mvc.perform(put(LEAVES + "/{id}", "missing").with(user("test"))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body(null, "2026-11-16", "2026-11-18")))
                .andExpect(status().isNotFound());
    }

    @Test
    void rangeQuery_returnsOnlyOverlappingLeave() throws Exception {
        var katarzyna = givenEmployee("Katarzyna", "Wiśniewska", 26, Map.of());
        var marek = givenEmployee("Marek", "Zieliński", 20, Map.of());
        var startsBefore = givenLeave(marek, "2026-10-28", "2026-11-06");
        var inside = givenLeave(katarzyna, "2026-11-16", "2026-11-20");
        givenLeave(katarzyna, "2026-10-19", "2026-10-23"); // ends the day before 'from'

        mvc.perform(get(LEAVES).param("from", "2026-10-24").param("to", "2026-11-30").with(user("test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", contains(startsBefore.getId(), inside.getId())));
    }

    @Test
    void employeeQuery_returnsThatEmployeesLeaveInTheYear() throws Exception {
        var tomasz = givenEmployee("Tomasz", "Nowak", 26, Map.of());
        var piotr = givenEmployee("Piotr", "Kamiński", 26, Map.of());
        var october = givenLeave(tomasz, "2026-10-20", "2026-10-23");
        var newYear = givenLeave(tomasz, "2026-12-28", "2027-01-08");
        givenLeave(tomasz, "2027-03-01", "2027-03-05");
        givenLeave(piotr, "2026-11-09", "2026-11-13");

        mvc.perform(get(LEAVES).param("employeeId", tomasz.getId()).param("year", "2026").with(user("test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].id", contains(october.getId(), newYear.getId())));
    }

    @Test
    void missingOrMixedQueryParameters_areInvalidQuery() throws Exception {
        mvc.perform(get(LEAVES).with(user("test")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY"));
        mvc.perform(get(LEAVES).param("from", "2026-11-01").param("year", "2026").with(user("test")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY"));
        mvc.perform(get(LEAVES).param("from", "2026-11-31").param("to", "2026-12-01").with(user("test")))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("INVALID_QUERY"));
    }

    private static String body(String employeeId, String start, String end) {
        var employee = employeeId == null ? "" : "\"employeeId\":\"" + employeeId + "\",";
        return "{" + employee + "\"startDate\":\"" + start + "\",\"endDate\":\"" + end + "\"}";
    }
}
