import { HttpClient, HttpHeaders, HttpParams } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { RepairRequest } from "../models/repair-request";
import { RepairRequestListItem } from "../models/repair-request-list-item";

@Injectable({
    providedIn: 'root'
})
export class RepairRequestService {
    private apiUrl = 'http://localhost:8080/api/repair-request/submit';
    private searchApiUrl = 'http://localhost:8080/api/internal/repair-request/search';

    constructor(private http: HttpClient) { }
  
    submitRepairRequest(repairRequest: RepairRequest): Observable<any> {
      const headers = new HttpHeaders({
        'Content-Type': 'application/json'
      });
  
      return this.http.post<any>(this.apiUrl, repairRequest, { headers });
    }

    searchRequests(): Observable<RepairRequestListItem[]> {
      const options = 
   { params: new HttpParams().set('page', 0).set('size', 10).set('sortField', 'submittedAt') };

      return this.http.get<RepairRequestListItem[]>(this.searchApiUrl, options);
    }
}