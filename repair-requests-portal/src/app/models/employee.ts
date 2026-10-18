/** Mirrors shop `team.controller.dto.Balance`: one employee's pool for one calendar year. */
export interface Balance {
    year: number;
    pool: number;
    /** true = nobody typed a pool for this year, so it is the employee's default */
    poolIsDefault: boolean;
    /** working days before the backend's today */
    taken: number;
    /** working days from today on */
    planned: number;
    /** may be negative - exceeding the pool only warns */
    remaining: number;
}

/** Mirrors shop `EmployeeView`. */
export interface Employee {
    id: string;
    firstName: string;
    lastName: string;
    colorIndex: number;
    defaultAnnualDays: number;
    balance: Balance;
}

/** Mirrors shop `EmployeeCommand`; `defaultAnnualDays` null = 26 on create, unchanged on update. */
export interface EmployeeCommand {
    firstName: string;
    lastName: string;
    defaultAnnualDays: number | null;
}
