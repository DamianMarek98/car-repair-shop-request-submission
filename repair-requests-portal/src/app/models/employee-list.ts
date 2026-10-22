import { Employee } from './employee';

/** Mirrors shop `EmployeeListView`. */
export interface EmployeeList {
    /** the backend's date ('YYYY-MM-DD') - use it instead of the browser clock */
    today: string;
    year: number;
    /** years the selector offers: earliest year with data … next year */
    availableYears: number[];
    employees: Employee[];
}
