package car.repair.shop.config.properties;

import lombok.Getter;
import lombok.Setter;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.validation.annotation.Validated;

import javax.validation.constraints.NotBlank;

@Getter
@Setter
@Validated
@ConfigurationProperties(prefix = "car.repair.shop.aws")
public class AwsConfigurationProperties {

    @NotBlank(message = "AWS access key must be configured")
    private String accessKey;

    @NotBlank(message = "AWS secret access key must be configured")
    private String secretAccessKey;

    @NotBlank(message = "AWS region must be configured")
    private String region;

    private String endpoint;

    /**
     * Local only: SES v2 endpoint when it differs from {@link #endpoint} (LocalStack community has
     * no SES v2, so local e-mails go to the local-env mail sink). Falls back to {@link #endpoint}.
     */
    private String sesEndpoint;

}
