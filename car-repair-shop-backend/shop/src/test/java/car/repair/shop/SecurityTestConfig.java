package car.repair.shop;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.context.annotation.Profile;
import org.springframework.security.core.userdetails.User;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.provisioning.InMemoryUserDetailsManager;

@Configuration
public class SecurityTestConfig {
    @Bean
    @Profile("test")
    public UserDetailsService userDetailsService() {
        UserDetails user = User.withUsername("test")
                .password("")
                .roles("USER")
                .build();

        return new InMemoryUserDetailsManager(user);
    }
}
