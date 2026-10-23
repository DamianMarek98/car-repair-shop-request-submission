import { Balance } from './employee';

/** Mirrors shop `LeaveView`; dates are 'YYYY-MM-DD', both inclusive. */
export interface Leave {
    id: string;
    employeeId: string;
    startDate: string;
    endDate: string;
    workingDays: number;
    /** working days per calendar year, keys like "2026" (a leave over New Year has two) */
    workingDaysByYear: Record<string, number>;
}

/** Mirrors shop `LeaveCommand`; `employeeId` may be omitted on update, but not changed. */
export interface LeaveCommand {
    employeeId?: string;
    startDate: string;
    endDate: string;
}

/** Mirrors shop `LeaveWarning`: the save went through, but the pool of `year` is exceeded. */
export interface LeaveWarning {
    code: string;
    year: number;
    remaining: number;
}

/** Mirrors shop `LeaveSaveResult`. */
export interface LeaveSaveResult {
    leave: Leave;
    balance: Balance[];
    warnings: LeaveWarning[];
}
