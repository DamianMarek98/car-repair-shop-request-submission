package car.repair.shop.repair.request;

import java.util.List;

public class RepairRequestBuilder {
    private String vin;
    private String plateNumber;
    private String issueDescription;
    private String firstName;
    private String lastName;
    private String email;
    private String phoneNumber;
    private List<PreferredVisitWindow> preferredVisitWindows;
    private boolean asap;
    private boolean rodo;
    private RepairRequestStatus status;

    RepairRequestBuilder withVin(String vin) {
        this.vin = vin;
        return this;
    }

    RepairRequestBuilder withPlateNumber(String plateNumber) {
        this.plateNumber = plateNumber;
        return this;
    }

    RepairRequestBuilder withIssueDescription(String issueDescription) {
        this.issueDescription = issueDescription;
        return this;
    }

    RepairRequestBuilder withFirstName(String firstName) {
        this.firstName = firstName;
        return this;
    }

    RepairRequestBuilder withLastName(String lastName) {
        this.lastName = lastName;
        return this;
    }

    RepairRequestBuilder withEmail(String email) {
        this.email = email;
        return this;
    }

    RepairRequestBuilder withPhoneNumber(String phoneNumber) {
        this.phoneNumber = phoneNumber;
        return this;
    }

    RepairRequestBuilder withPreferredVisitWindows(List<PreferredVisitWindow> preferredVisitWindows) {
        this.preferredVisitWindows = preferredVisitWindows;
        return this;
    }

    RepairRequestBuilder withEmptyPreferredVisitWindows() {
        this.preferredVisitWindows = List.of();
        return this;
    }

    RepairRequestBuilder asap() {
        this.asap = true;
        return this;
    }

    RepairRequestBuilder withRodoApproval() {
        this.rodo = true;
        return this;
    }

    RepairRequestBuilder withStatus(RepairRequestStatus status) {
        this.status = status;
        return this;
    }

    RepairRequest build() {
        var repairRequest = new RepairRequest();
        repairRequest.setVin(vin);
        repairRequest.setIssueDescription(issueDescription);
        repairRequest.setSubmitterFirstName(firstName);
        repairRequest.setSubmitterLastName(lastName);
        repairRequest.setEmail(email);
        repairRequest.setPhoneNumber(phoneNumber);
        repairRequest.setPreferredVisitWindows(preferredVisitWindows);
        repairRequest.setAsap(asap);
        repairRequest.setStatus(status == null ? RepairRequestStatus.NEW : status);
        return repairRequest;
    }
}
