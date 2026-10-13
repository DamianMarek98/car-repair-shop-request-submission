package car.repair.shop.repair.request;

import org.springframework.data.repository.Repository;

import java.util.List;

/**
 * Lookup by the status-link secret. Deliberately without {@code @EnableScan}: this must be a
 * query on the TrackingTokenIndex GSI, never a table scan.
 */
interface RepairRequestTrackingRepository extends Repository<RepairRequest, String> {
    List<RepairRequest> findByTrackingToken(String trackingToken);
}
