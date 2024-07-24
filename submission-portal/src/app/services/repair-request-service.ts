import { HttpClient, HttpHeaders } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { RepairRequest } from "../models/repair-request";
import { environment } from "../../environments/environment";


@Injectable({
  providedIn: 'root'
})
export class RepairRequestService {
  private apiUrl = environment.apiUrl + '/repair-request/submit';

  constructor(private http: HttpClient) { }

  submitRepairRequest(repairRequest: RepairRequest): Observable<any> {
    const headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    return this.http.post<any>(this.apiUrl, repairRequest, { headers });
  }
}