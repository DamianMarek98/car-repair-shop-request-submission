package car.repair.shop.notification;

import car.repair.shop.config.properties.AwsConfigurationProperties;
import org.junit.jupiter.api.Test;

import java.net.URI;

import static org.assertj.core.api.Assertions.assertThat;

class SesConfigTest {

    @Test
    void shouldSendToLocalEndpointWhenConfigured() {
        // local / test profiles: e-mails must never reach real SES
        try (var client = SesConfig.buildClient(properties("http://localhost:4566"))) {
            var configuration = client.serviceClientConfiguration();

            assertThat(configuration.endpointOverride()).contains(URI.create("http://localhost:4566"));
            assertThat(configuration.region().id()).isEqualTo("eu-north-1");
        }
    }

    @Test
    void shouldPreferDedicatedSesEndpoint() {
        var properties = properties("http://localhost:4566");
        properties.setSesEndpoint("http://localhost:8025");

        try (var client = SesConfig.buildClient(properties)) {
            assertThat(client.serviceClientConfiguration().endpointOverride())
                    .contains(URI.create("http://localhost:8025"));
        }
    }

    @Test
    void shouldUseRealSesInEuNorth1WhenNoEndpointConfigured() {
        try (var client = SesConfig.buildClient(properties(null))) {
            var configuration = client.serviceClientConfiguration();

            assertThat(configuration.endpointOverride()).isEmpty();
            assertThat(configuration.region().id()).isEqualTo("eu-north-1");
        }
    }

    private static AwsConfigurationProperties properties(String endpoint) {
        var properties = new AwsConfigurationProperties();
        properties.setAccessKey("009160054371");
        properties.setSecretAccessKey("test");
        properties.setRegion("eu-north-1");
        properties.setEndpoint(endpoint);
        return properties;
    }
}
