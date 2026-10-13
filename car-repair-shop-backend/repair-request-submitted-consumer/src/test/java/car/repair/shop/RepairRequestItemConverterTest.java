package car.repair.shop;

import org.junit.jupiter.api.Test;

import java.util.HashSet;
import java.util.Set;
import java.util.stream.IntStream;

import static org.assertj.core.api.Assertions.assertThat;

class RepairRequestItemConverterTest {

    @Test
    void trackingTokenShouldBeUrlSafe256BitValue() {
        // 32 bytes -> 43 base64url chars without padding; must fit a /status/{token} URL as-is
        assertThat(RepairRequestItemConverter.generateTrackingToken()).matches("[A-Za-z0-9_-]{43}");
    }

    @Test
    void trackingTokensShouldBeUnique() {
        Set<String> tokens = new HashSet<>();
        IntStream.range(0, 1000).forEach(i -> tokens.add(RepairRequestItemConverter.generateTrackingToken()));

        assertThat(tokens).hasSize(1000);
    }
}
