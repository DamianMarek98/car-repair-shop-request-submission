package car.repair.shop.notification;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import software.amazon.awssdk.http.urlconnection.UrlConnectionHttpClient;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.sesv2.SesV2Client;

@Configuration
class SesConfig {
    private static final Region SES_REGION = Region.EU_NORTH_1;

    @Bean
    SesV2Client sesV2Client() {
        return SesV2Client.builder()
                .region(SES_REGION)
                .httpClientBuilder(UrlConnectionHttpClient.builder())
                .build();
    }
}
