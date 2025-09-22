package car.repair.shop;

import software.amazon.awssdk.services.dynamodb.model.AttributeValue;

import java.util.HashMap;
import java.util.Map;
import java.util.UUID;

public class RepairRequestItemConverter {

    private RepairRequestItemConverter() {
    }

    public static Map<String, AttributeValue> toItem(final SubmitRepairRequestDto submitRepairRequestDto) {
        var timeSlots = submitRepairRequestDto.timeSlots()
                .stream()
                .map(PreferredVisitWindow::from)
                .toList();
        Map<String, AttributeValue> item = new HashMap<>();
        item.put("id", stringAttribute(UUID.randomUUID().toString()));
        item.put("dummyPartitionKey", stringAttribute("DUMMY"));
        // todo write all attributes and add test

        return item;
    }

    private static AttributeValue stringAttribute(String value) {
        return AttributeValue.builder().s(value).build();
    }
}
