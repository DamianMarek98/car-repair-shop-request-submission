import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { Employee, EmployeeCommand } from "../models/employee";
import { EmployeeList } from "../models/employee-list";

@Injectable({
    providedIn: 'root'
})
export class TeamService {
    private apiUrl = environment.apiUrl + '/internal/team/employees';

    constructor(private http: HttpClient) { }

    /** Without a year the backend uses its current year. */
    list(year?: number): Observable<EmployeeList> {
        const params: Record<string, number> = year === undefined ? {} : { year };
        return this.http.get<EmployeeList>(this.apiUrl, { params });
    }

    create(command: EmployeeCommand): Observable<Employee> {
        return this.http.post<Employee>(this.apiUrl, command);
    }

    update(id: string, command: EmployeeCommand): Observable<Employee> {
        return this.http.put<Employee>(this.apiUrl + '/' + id, command);
    }

    /** Types the pool for one year by hand; `null` goes back to the employee's default pool. */
    setPool(id: string, year: number, days: number | null): Observable<Employee> {
        return this.http.put<Employee>(this.apiUrl + '/' + id + '/pool/' + year, { days });
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(this.apiUrl + '/' + id);
    }
}
