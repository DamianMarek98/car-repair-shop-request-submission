/** `TAKEN` ended before today, `PLANNED` starts today or later, `IN_PROGRESS` spans today. */
export type ReportLeaveStatus = 'TAKEN' | 'IN_PROGRESS' | 'PLANNED';

/** Mirrors shop `YearReport.ReportLeave`: full dates, but only the working days inside the report year. */
export interface ReportLeave {
    startDate: string;
    endDate: string;
    daysInYear: number;
    status: ReportLeaveStatus;
}

/** Mirrors shop `YearReport` - Raport roczny of one employee for one calendar year. */
export interface YearReport {
    employee: { id: string; firstName: string; lastName: string };
    year: number;
    /** the backend's today ('YYYY-MM-DD') */
    generatedOn: string;
    pool: number;
    poolIsDefault: boolean;
    taken: number;
    planned: number;
    remaining: number;
    /** working days per month, index 0 = January */
    months: number[];
    leaves: ReportLeave[];
}
