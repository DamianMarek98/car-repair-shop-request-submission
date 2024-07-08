package car.repair.shop.repair.request.query;

import org.apache.logging.log4j.util.Strings;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

public record SearchRepairRequestQuery(int page,
                                       int size,
                                       String sortField,
                                       Sort.Direction sortDirection) {
    public PageRequest toPageRequest() {
        Sort.Direction direction = sortDirection == null ? Sort.Direction.DESC : sortDirection;
        Sort sort = Strings.isBlank(sortField) ? Sort.unsorted() : Sort.by(direction, sortField);
        return PageRequest.of(page(), size(), sort);
    }
}
