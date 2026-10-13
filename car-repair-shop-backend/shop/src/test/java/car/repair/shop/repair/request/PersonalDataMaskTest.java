package car.repair.shop.repair.request;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.NullSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class PersonalDataMaskTest {

    @Test
    void shouldShowOnlyLastFiveCharsOfVin() {
        assertThat(PersonalDataMask.vin("4Y1SL65848Z411439")).isEqualTo("***…11439");
    }

    @Test
    void shouldShowOnlyLastThreeDigitsOfPhoneNumber() {
        assertThat(PersonalDataMask.phoneNumber("111222567")).isEqualTo("••• ••• 567");
        assertThat(PersonalDataMask.phoneNumber("+48 111 222 567")).isEqualTo("••• ••• 567");
    }

    @Test
    void shouldShowOnlyFirstCharAndDomainOfEmail() {
        assertThat(PersonalDataMask.email("anna@example.com")).isEqualTo("a••••@example.com");
        // a one-letter local part reveals nothing more than its first char either
        assertThat(PersonalDataMask.email("a@example.com")).isEqualTo("a••••@example.com");
    }

    @ParameterizedTest
    @NullSource
    @ValueSource(strings = {"", "   "})
    void shouldKeepMissingValuesMissing(String value) {
        assertThat(PersonalDataMask.vin(value)).isNull();
        assertThat(PersonalDataMask.phoneNumber(value)).isNull();
        assertThat(PersonalDataMask.email(value)).isNull();
    }

    @ParameterizedTest
    @ValueSource(strings = {"1", "12345"})
    void shouldFullyMaskVinTooShortToMask(String vin) {
        assertThat(PersonalDataMask.vin(vin)).isEqualTo("***…");
    }

    @ParameterizedTest
    @ValueSource(strings = {"1", "123", "1 2 3"})
    void shouldFullyMaskPhoneNumberTooShortToMask(String phoneNumber) {
        assertThat(PersonalDataMask.phoneNumber(phoneNumber)).isEqualTo("••• •••");
    }

    @ParameterizedTest
    @ValueSource(strings = {"not-an-email", "@example.com"})
    void shouldFullyMaskMalformedEmail(String email) {
        assertThat(PersonalDataMask.email(email)).isEqualTo("••••");
    }
}
