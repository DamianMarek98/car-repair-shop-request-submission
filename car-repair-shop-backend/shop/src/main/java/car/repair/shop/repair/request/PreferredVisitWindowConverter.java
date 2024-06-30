package car.repair.shop.repair.request;

import com.amazonaws.services.dynamodbv2.datamodeling.DynamoDBTypeConverter;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;

import java.io.IOException;
import java.util.List;

public class PreferredVisitWindowConverter implements DynamoDBTypeConverter<String, List<PreferredVisitWindow>> {

    private final ObjectMapper objectMapper = new ObjectMapper();

    @Override
    public String convert(List<PreferredVisitWindow> object) {
        try {
            return objectMapper.writeValueAsString(object);
        } catch (IOException e) {
            throw new IllegalArgumentException("Error converting list to JSON", e);
        }
    }

    @Override
    public List<PreferredVisitWindow> unconvert(String object) {
        try {
            return objectMapper.readValue(object, new TypeReference<>() {
            });
        } catch (IOException e) {
            throw new IllegalArgumentException("Error converting JSON to list", e);
        }
    }
}
