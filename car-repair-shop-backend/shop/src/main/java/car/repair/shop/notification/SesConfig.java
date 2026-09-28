package car.repair.shop.notification;

import car.repair.shop.config.properties.AwsConfigurationProperties;
import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.StringUtils;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sesv2.SesV2Client;

import java.net.URI;

@Configuration
@RequiredArgsConstructor
class SesConfig {
    private static final Region SES_REGION = Region.EU_NORTH_1;

    private final AwsConfigurationProperties awsConfigurationProperties;

    /**
     * Production (no {@code car.repair.shop.aws.endpoint}): real SES in eu-north-1 with the
     * Lambda's execution role.
     * <p>
     * Local / test ({@code ses-endpoint} or {@code endpoint} set, e.g. the local-env mail sink
     * {@code http://localhost:8025}): every e-mail goes to that endpoint with the configured fake
     * credentials, so running the app locally can never send a real e-mail - even when
     * {@code ~/.aws/credentials} exists.
     */
    @Bean
    SesV2Client sesV2Client() {
        return buildClient(awsConfigurationProperties);
    }

    static SesV2Client buildClient(AwsConfigurationProperties properties) {
        var builder = SesV2Client.builder()
                .httpClientBuilder(UrlConnectionHttpClient.builder());

        var endpoint = StringUtils.hasText(properties.getSesEndpoint())
                ? properties.getSesEndpoint()
                : properties.getEndpoint();
        if (!StringUtils.hasText(endpoint)) {
            return builder.region(SES_REGION).build();
        }

        return builder
                .endpointOverride(URI.create(endpoint))
                .region(Region.of(properties.getRegion()))
                .credentialsProvider(StaticCredentialsProvider.create(
                        AwsBasicCredentials.create(properties.getAccessKey(), properties.getSecretAccessKey())))
                .build();
    }
}
