package car.repair.shop.repair.request;

import car.repair.shop.availability.UnavailableDateDto;
import car.repair.shop.availability.UnavailableDayFacade;
import car.repair.shop.commons.exceptions.EntityNotFoundException;
import car.repair.shop.notification.NotificationFacade;
import car.repair.shop.repair.request.controller.dto.SetAppointmentCommand;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.util.StringUtils;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.util.Set;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SetAppointmentCommandHandler {
    private final RepairRequestRepository repairRequestRepository;
    private final UnavailableDayFacade unavailableDayFacade;
    private final NotificationFacade notificationFacade;

    public void handle(String id, SetAppointmentCommand command) {
        var repairRequestState = repairRequestRepository.findById(id)
                .map(RepairRequestStateFactory::from)
                .orElseThrow(EntityNotFoundException::new);

        var appointmentAt = command == null ? null : command.appointmentAt();
        AppointmentTimePolicy.validate(appointmentAt, LocalDateTime.now(ZoneOffset.UTC), unavailableDays());

        var previousAppointmentAt = repairRequestState.repairRequest.getAppointmentAt();
        repairRequestState.setAppointment(appointmentAt);
        var repairRequest = repairRequestRepository.save(repairRequestState.repairRequest);

        // The appointment is persisted before the e-mail is attempted; a failed send never fails the action
        if (!appointmentAt.equals(previousAppointmentAt) && StringUtils.hasText(repairRequest.getEmail())) {
            notificationFacade.sendAppointmentEmail(repairRequest.getEmail(), repairRequest.getSubmitterFirstName(),
                    appointmentAt, previousAppointmentAt != null, repairRequest.getTrackingToken());
        }
    }

    private Set<LocalDate> unavailableDays() {
        return unavailableDayFacade.getAllUnavailableDays().stream()
                .map(UnavailableDateDto::date)
                .collect(Collectors.toSet());
    }
}
