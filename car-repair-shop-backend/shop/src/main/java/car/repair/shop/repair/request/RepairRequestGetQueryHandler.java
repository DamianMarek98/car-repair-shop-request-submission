package car.repair.shop.repair.request;

import car.repair.shop.commons.exceptions.EntityNotFoundException;
import car.repair.shop.repair.request.controller.dto.PreferredVisitWindowDto;
import car.repair.shop.repair.request.controller.dto.RepairRequestDto;
import lombok.RequiredArgsConstructor;
import org.jetbrains.annotations.NotNull;
import org.springframework.stereotype.Service;

import java.util.Comparator;


@Service
@RequiredArgsConstructor
public class RepairRequestGetQueryHandler {
    private final RepairRequestRepository repairRequestRepository;

    private static @NotNull Comparator<PreferredVisitWindowDto> getPreferredVisitWindowDtoComparator() {
        return (window1, window2) -> {
            var dateResult = window1.date().compareTo(window2.date());
            if (dateResult == 0 && window1.from() != null && window2.from() != null) {
                return window1.from().compareTo(window2.from());
            } else if (dateResult == 0 && window1.to() != null && window2.to() != null) {
                return window1.to().compareTo(window2.to());
            }

            return dateResult;
        };
    }

    public RepairRequestDto getById(String id) {
        return repairRequestRepository.findById(id)
                .map(repairRequest -> {
                    var windows = repairRequest.getPreferredVisitWindows().stream()
                            .map(PreferredVisitWindow::toDto)
                            .sorted(getPreferredVisitWindowDtoComparator())
                            .toList();
                    return RepairRequestDto.from(repairRequest, windows);
                })
                .orElseThrow(EntityNotFoundException::new);
    }
}
