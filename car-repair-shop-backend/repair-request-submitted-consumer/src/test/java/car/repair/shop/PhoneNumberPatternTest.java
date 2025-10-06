package car.repair.shop;


import org.junit.jupiter.api.Assertions;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import java.util.regex.Matcher;
import java.util.regex.Pattern;

class PhoneNumberPatternTest {

    @ParameterizedTest
    @ValueSource(strings = {"2055550125", "202 555 0125", "(202) 555-0125", "+111 (202) 555-0125",
            "636 856 789", "+111 636 856 789", "636 85 67 89", "+111 636 85 67 89"})
    void whenMatchesPhoneNumber_thenCorrect(String phoneNumber) {
        Pattern pattern = Pattern.compile(PhoneNumberPattern.PHONE_NUMBER_PATTERN);
        Matcher matcher = pattern.matcher(phoneNumber);
        Assertions.assertTrue(matcher.matches());
    }

    @ParameterizedTest
    @ValueSource(strings = {"a", "202 5x55 0125", "--(202) 555-0125", "+111 (202) 555-0125-12312"})
    void whenNotMatchesPhoneNumber_thenIncorrect(String phoneNumber) {
        Pattern pattern = Pattern.compile(PhoneNumberPattern.PHONE_NUMBER_PATTERN);
        Matcher matcher = pattern.matcher(phoneNumber);
        Assertions.assertFalse(matcher.matches());
    }
}
