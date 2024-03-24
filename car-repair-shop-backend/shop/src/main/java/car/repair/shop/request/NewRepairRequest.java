package car.repair.shop.request;

import car.repair.shop.commons.aggregate.PreferredVisitDate;
import car.repair.shop.commons.aggregate.Version;
import lombok.Getter;

import java.time.LocalDateTime;
import java.util.List;

@Getter
public class NewRepairRequest implements RepairRequest {
    private RepairRequestId repairRequestId;
    private Version version;
    private String model;
    private Integer productionYear;
    private String issueDescription;
    private String name;
    private String email;
    private String phoneNumber;
    private List<PreferredVisitDate> preferredVisitDates;
    private LocalDateTime submittedAt;
}
