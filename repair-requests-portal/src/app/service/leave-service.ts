import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from "../../environments/environment";
import { Leave, LeaveCommand, LeaveSaveResult } from "../models/leave";

@Injectable({
    providedIn: 'root'
})
export class LeaveService {
    private apiUrl = environment.apiUrl + '/internal/team/leaves';

    constructor(private http: HttpClient) { }

    /** Every employee's leave overlapping `[from, to]` - the calendar asks for its visible grid. */
    inRange(from: string, to: string): Observable<Leave[]> {
        return this.http.get<Leave[]>(this.apiUrl, { params: { from, to } });
    }

    /** One employee's leave with at least one working day in `year`, sorted by start. */
    forEmployee(employeeId: string, year: number): Observable<Leave[]> {
        return this.http.get<Leave[]>(this.apiUrl, { params: { employeeId, year } });
    }

    create(command: LeaveCommand): Observable<LeaveSaveResult> {
        return this.http.post<LeaveSaveResult>(this.apiUrl, command);
    }

    update(id: string, command: LeaveCommand): Observable<LeaveSaveResult> {
        return this.http.put<LeaveSaveResult>(this.apiUrl + '/' + id, command);
    }

    delete(id: string): Observable<void> {
        return this.http.delete<void>(this.apiUrl + '/' + id);
    }
}
