package car.repair.shop.team.controller;

import car.repair.shop.team.TeamFacade;
import car.repair.shop.team.controller.dto.EmployeeCommand;
import car.repair.shop.team.controller.dto.EmployeeListView;
import car.repair.shop.team.controller.dto.EmployeeView;
import car.repair.shop.team.controller.dto.PoolCommand;
import car.repair.shop.team.controller.dto.YearReport;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

/**
 * Zespół panel API. Authenticated by the default {@code anyRequest().authenticated()} rule - employee
 * data is personal data, never add these paths to the permitAll list. Years arrive as strings so a bad
 * value becomes a coded {@code INVALID_YEAR} instead of the catch-all 500.
 */
@RestController
@RequestMapping("/api/internal/team/employees")
@RequiredArgsConstructor
public class EmployeeController {
    private final TeamFacade teamFacade;

    @GetMapping
    @ResponseStatus(code = HttpStatus.OK)
    public EmployeeListView list(@RequestParam(required = false) String year) {
        return teamFacade.listEmployees(year);
    }

    @PostMapping
    @ResponseStatus(code = HttpStatus.CREATED)
    public EmployeeView create(@RequestBody EmployeeCommand command) {
        return teamFacade.createEmployee(command);
    }

    @PutMapping("/{id}")
    @ResponseStatus(code = HttpStatus.OK)
    public EmployeeView update(@PathVariable String id, @RequestBody EmployeeCommand command) {
        return teamFacade.updateEmployee(id, command);
    }

    @PutMapping("/{id}/pool/{year}")
    @ResponseStatus(code = HttpStatus.OK)
    public EmployeeView setPool(@PathVariable String id, @PathVariable String year,
                                @RequestBody(required = false) PoolCommand command) {
        return teamFacade.setPool(id, year, command);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(code = HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        teamFacade.deleteEmployee(id);
    }

    /** Raport roczny: one employee's year summary (defaults to the current year). */
    @GetMapping("/{id}/report")
    @ResponseStatus(code = HttpStatus.OK)
    public YearReport report(@PathVariable String id, @RequestParam(required = false) String year) {
        return teamFacade.yearReport(id, year);
    }
}
