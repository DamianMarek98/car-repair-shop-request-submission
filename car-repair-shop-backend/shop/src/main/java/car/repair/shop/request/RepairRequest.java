package car.repair.shop.request;

import car.repair.shop.commons.aggregate.Version;

interface RepairRequest {
    RepairRequestId getRepairRequestId();
    Version getVersion();
}
