package car.repair.shop.team.controller;

import car.repair.shop.team.TeamFacade;
import car.repair.shop.team.controller.dto.LeaveCommand;
import car.repair.shop.team.controller.dto.LeaveSaveResult;
import car.repair.shop.team.controller.dto.LeaveView;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Urlopy panel API. Authenticated by the default {@code anyRequest().authenticated()} rule - never add
 * these paths to the permitAll list. Query values arrive as strings and are validated in the facade, so
 * bad input becomes a coded 400 instead of the catch-all 500.
 */
@RestController
@RequestMapping("/api/internal/team/leaves")
@RequiredArgsConstructor
public class LeaveController {
    private final TeamFacade teamFacade;

    /** {@code ?from=&to=} (calendar grid) or {@code ?employeeId=&year=} (one employee's list). */
    @GetMapping
    @ResponseStatus(code = HttpStatus.OK)
    public List<LeaveView> list(@RequestParam(required = false) String from,
                                @RequestParam(required = false) String to,
                                @RequestParam(required = false) String employeeId,
                                @RequestParam(required = false) String year) {
        return teamFacade.listLeaves(from, to, employeeId, year);
    }

    @PostMapping
    @ResponseStatus(code = HttpStatus.CREATED)
    public LeaveSaveResult create(@RequestBody LeaveCommand command) {
        return teamFacade.createLeave(command);
    }

    @PutMapping("/{id}")
    @ResponseStatus(code = HttpStatus.OK)
    public LeaveSaveResult update(@PathVariable String id, @RequestBody LeaveCommand command) {
        return teamFacade.updateLeave(id, command);
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(code = HttpStatus.NO_CONTENT)
    public void delete(@PathVariable String id) {
        teamFacade.deleteLeave(id);
    }
}
