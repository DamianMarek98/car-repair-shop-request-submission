/** Statuses the public status API can return. Phase 3 adds RESCHEDULE_REQUESTED and CANCELLED. */
export type RepairRequestStatusValue = 'NEW' | 'HANDLED' | 'APPOINTMENT_MADE';

export interface PreferredVisitWindow {
    /** Local calendar day, `YYYY-MM-DD` (not UTC). */
    date: string;
    /** Local wall-clock time, `HH:mm:ss`. */
    from: string | null;
    to: string | null;
}

/**
 * Response of `GET /public/repair-request/status/{token}` (shop's `PublicRepairRequestStatusDto`).
 * `vin`, `phoneNumber` and `email` arrive already masked - render them as they are.
 * `*At` fields are UTC without offset, see `commons/utc-date-time.ts`.
 */
export interface RepairRequestStatus {
    status: RepairRequestStatusValue | string;
    submitterFirstName: string;
    plateNumber: string | null;
    vin: string | null;
    phoneNumber: string | null;
    email: string | null;
    issueDescription: string;
    asap: boolean;
    preferredVisitWindows: PreferredVisitWindow[];
    submittedAt: string;
    appointmentAt: string | null;
    completedAt: string | null;
}
