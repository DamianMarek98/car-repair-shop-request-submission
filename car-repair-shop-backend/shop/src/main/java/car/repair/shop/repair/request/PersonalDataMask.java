package car.repair.shop.repair.request;

import org.springframework.util.StringUtils;

/**
 * Masks personal data shown on the public status page. Anyone holding the link sees the page, so
 * it only ever reveals enough for the customer to recognise their own request.
 * <p>
 * Blank input stays {@code null}; input too short to mask safely is replaced entirely.
 */
final class PersonalDataMask {
    static final String VIN_MASK = "***…";
    static final String PHONE_MASK = "••• •••";
    static final String EMAIL_MASK = "••••";
    private static final int VIN_VISIBLE_CHARS = 5;
    private static final int PHONE_VISIBLE_CHARS = 3;

    private PersonalDataMask() {
    }

    /** {@code 4Y1SL65848Z411439 -> ***…11439} */
    static String vin(String vin) {
        if (!StringUtils.hasText(vin)) {
            return null;
        }
        var value = vin.trim();
        if (value.length() <= VIN_VISIBLE_CHARS) {
            return VIN_MASK;
        }
        return VIN_MASK + value.substring(value.length() - VIN_VISIBLE_CHARS);
    }

    /** {@code 123 456 567 -> ••• ••• 567} */
    static String phoneNumber(String phoneNumber) {
        if (!StringUtils.hasText(phoneNumber)) {
            return null;
        }
        var value = StringUtils.trimAllWhitespace(phoneNumber);
        if (value.length() <= PHONE_VISIBLE_CHARS) {
            return PHONE_MASK;
        }
        return PHONE_MASK + " " + value.substring(value.length() - PHONE_VISIBLE_CHARS);
    }

    /** {@code anna@example.com -> a••••@example.com} */
    static String email(String email) {
        if (!StringUtils.hasText(email)) {
            return null;
        }
        var value = email.trim();
        int at = value.lastIndexOf('@');
        if (at <= 0) {
            return EMAIL_MASK;
        }
        return value.charAt(0) + EMAIL_MASK + value.substring(at);
    }
}
