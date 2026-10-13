import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { RepairRequestStatus } from "../models/repair-request-status";
import { environment } from "../../environments/environment";

@Injectable({
    providedIn: 'root'
})
export class StatusService {
    private apiUrl = environment.apiUrl + '/public/repair-request/status';

    constructor(private http: HttpClient) { }

    /** 404 for an unknown, malformed or expired token - the backend does not tell them apart. */
    getStatus(token: string): Observable<RepairRequestStatus> {
        return this.http.get<RepairRequestStatus>(this.apiUrl + '/' + encodeURIComponent(token));
    }
}
