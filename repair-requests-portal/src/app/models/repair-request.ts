import { PreferredVisitWindowDto } from "./preferred-visit-window";

export interface RepairRequest {
    id: string;
    vin: string;
    plateNumber: string;
    issueDescription: string;
    submitterFirstName: string;
    submitterLastName: string;
    email: string;
    phoneNumber: string;
    asap: boolean;
    reviewEmailConsent: boolean;
    reviewEmailSentAt: string | null;
    preferredVisitWindows: PreferredVisitWindowDto[];
    submittedAt: string;
    handledAt: string;
    status: string;
  }