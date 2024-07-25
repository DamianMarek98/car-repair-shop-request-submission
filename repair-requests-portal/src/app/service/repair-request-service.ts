import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { PaginatedRespone } from "../models/page-response";
import { RepairRequest } from "../models/repair-request";
import { RepairRequestListItem } from "../models/repair-request-list-item";
import { environment } from "../../environments/environment";

@Injectable({
    providedIn: 'root'
})
export class RepairRequestService {
    private apiUrl = environment.apiUrl + '/internal/repair-request';

    constructor(private http: HttpClient) { }


    searchRequests(page: number = 0, size: number = 25): Observable<PaginatedRespone<RepairRequestListItem>> {
        const options =
            { params: new HttpParams().set('page', page).set('size', size).set('sortField', 'submittedAt') };

        return this.http.get<PaginatedRespone<RepairRequestListItem>>(this.apiUrl + '/search', options);
    }

    getRepairRequest(id: string): Observable<RepairRequest> {
        return this.http.get<RepairRequest>(this.apiUrl + '/' + id);
    }

    markRepairRequestAsHandled(id: string): Observable<void> {
        return this.http.post<void>(this.apiUrl + '/' + id + '/mark-as-handled', {});
    }

    markRepairRequestAsAppointmentMade(id: string): Observable<void> {
        return this.http.post<void>(this.apiUrl + '/' + id + '/mark-as-appointment-made', {});
    }
}