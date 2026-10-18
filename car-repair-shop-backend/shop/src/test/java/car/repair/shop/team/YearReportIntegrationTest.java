package car.repair.shop.team;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Map;

import static org.hamcrest.Matchers.contains;
import static org.hamcrest.Matchers.hasSize;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.user;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@AutoConfigureMockMvc
class YearReportIntegrationTest extends TeamIntegrationTest {
    private static final String REPORT = "/api/internal/team/employees/{id}/report";

    @Autowired
    private MockMvc mvc;

    @Test
    void withoutUser_isUnauthorized() throws Exception {
        mvc.perform(get(REPORT, "any")).andExpect(status().isUnauthorized());
    }

    @Test
    void tomasz2026_matchesTheSeedScenario() throws Exception {
        var tomasz = givenEmployee("Tomasz", "Nowak", 26, Map.of("2026", 9, "2027", 30));
        givenLeave(tomasz, "2026-10-20", "2026-10-23");
        givenLeave(tomasz, "2026-12-28", "2027-01-08");

        mvc.perform(get(REPORT, tomasz.getId()).param("year", "2026").with(user("test")))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.employee.lastName").value("Nowak"))
                .andExpect(jsonPath("$.year").value(2026))
                .andExpect(jsonPath("$.generatedOn").value("2026-11-02"))
                .andExpect(jsonPath("$.pool").value(9))
                .andExpect(jsonPath("$.poolIsDefault").value(false))
                .andExpect(jsonPath("$.taken").value(4))
                .andExpect(jsonPath("$.planned").value(4))
                .andExpect(jsonPath("$.remaining").value(1))
                .andExpect(jsonPath("$.months", contains(0, 0, 0, 0, 0, 0, 0, 0, 0, 4, 0, 4)))
                .andExpect(jsonPath("$.leaves", hasSize(2)))
                .andExpect(jsonPath("$.leaves[0].status").value("TAKEN"))
                .andExpect(jsonPath("$.leaves[1].startDate").value("2026-12-28"))
                .andExpect(jsonPath("$.leaves[1].endDate").value("2027-01-08"))
                .andExpect(jsonPath("$.leaves[1].daysInYear").value(4))
                .andExpect(jsonPath("$.leaves[1].status").value("PLANNED"));
    }

    @Test
    void tomasz2027_countsOnlyTheNewYearPartOfTheLeave() throws Exception {
        var tomasz = givenEmployee("Tomasz", "Nowak", 26, Map.of("2026", 9, "2027", 30));
        givenLeave(tomasz, "2026-10-20", "2026-10-23");
        givenLeave(tomasz, "2026-12-28", "2027-01-08");

        mvc.perform(get(REPORT, tomasz.getId()).param("year", "2027").with(user("test")))
                .andExpect(jsonPath("$.pool").value(30))
                .andExpect(jsonPath("$.planned").value(6))
                .andExpect(jsonPath("$.remaining").value(24))
                .andExpect(jsonPath("$.months[0]").value(6))
                .andExpect(jsonPath("$.leaves", hasSize(1)))
                .andExpect(jsonPath("$.leaves[0].daysInYear").value(6));
    }

    @Test
    void leaveSpanningToday_isInProgress() throws Exception {
        var marek = givenEmployee("Marek", "Zieliński", 20, Map.of());
        givenLeave(marek, "2026-10-28", "2026-11-06");

        mvc.perform(get(REPORT, marek.getId()).param("year", "2026").with(user("test")))
                .andExpect(jsonPath("$.taken").value(3))
                .andExpect(jsonPath("$.planned").value(5))
                .andExpect(jsonPath("$.months[9]").value(3))
                .andExpect(jsonPath("$.months[10]").value(5))
                .andExpect(jsonPath("$.leaves[0].status").value("IN_PROGRESS"));
    }

    @Test
    void withoutYear_usesCurrentYear() throws Exception {
        var agnieszka = givenEmployee("Agnieszka", "Dąbrowska", 20, Map.of());

        mvc.perform(get(REPORT, agnieszka.getId()).with(user("test")))
                .andExpect(jsonPath("$.year").value(2026))
                .andExpect(jsonPath("$.remaining").value(20))
                .andExpect(jsonPath("$.leaves", hasSize(0)));
    }

    @Test
    void unknownEmployee_isNotFound() throws Exception {
        mvc.perform(get(REPORT, "missing").param("year", "2026").with(user("test")))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.code").value("EMPLOYEE_NOT_FOUND"));
    }
}
