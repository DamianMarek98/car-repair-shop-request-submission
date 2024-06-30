package car.repair.shop.config;

import car.repair.shop.config.properties.AwsConfigurationProperties;
import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.amazonaws.client.builder.AwsClientBuilder;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDB;
import com.amazonaws.services.dynamodbv2.AmazonDynamoDBClientBuilder;
import lombok.RequiredArgsConstructor;
import org.socialsignin.spring.data.dynamodb.repository.config.EnableDynamoDBRepositories;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;

@Configuration
@RequiredArgsConstructor
@EnableDynamoDBRepositories(basePackages = "car.repair.shop")
@EnableConfigurationProperties(value = AwsConfigurationProperties.class)
public class DynamoDBConfig {
    private final AwsConfigurationProperties awsConfigurationProperties;

    @Bean
    @Profile("test || local")
    public AmazonDynamoDB amazonDynamoDB() {
        return AmazonDynamoDBClientBuilder.standard()
                .withEndpointConfiguration(new AwsClientBuilder.EndpointConfiguration(awsConfigurationProperties.getEndpoint(), awsConfigurationProperties.getRegion()))
                .withCredentials(new AWSStaticCredentialsProvider(new BasicAWSCredentials(awsConfigurationProperties.getAccessKey(), awsConfigurationProperties.getSecretAccessKey())))
                .build();
    }
}
