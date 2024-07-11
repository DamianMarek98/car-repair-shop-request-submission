import { HttpClient, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { RepairRequestListItem } from "../models/repair-request-list-item";
import { PaginatedRespone } from "../models/page-response";

@Injectable({
    providedIn: 'root'
})
export class RepairRequestService {
    private apiUrl = 'http://localhost:8080/api/internal/repair-request';

    constructor(private http: HttpClient) { }


    searchRequests(page: number = 0, size: number = 25): Observable<PaginatedRespone<RepairRequestListItem>> {
        const options =
            { params: new HttpParams().set('page', page).set('size', size).set('sortField', 'submittedAt') };

        return this.http.get<PaginatedRespone<RepairRequestListItem>>(this.apiUrl + '/search', options);
    }
}