import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { UnavailableDay } from "../models/unavailable-day";
import { environment } from "../../environments/environment";

@Injectable({
    providedIn: 'root'
})
export class UnavailableDaysService {
    private apiUrl = environment.apiUrl + '/internal/unavailable-day';

    constructor(private http: HttpClient) { }


    getAll(): Observable<UnavailableDay[]> {
        return this.http.get<UnavailableDay[]>(this.apiUrl + "/all");
    }

    removeUnavailableDate(id: string): Observable<void> {
        return this.http.delete<void>(this.apiUrl + '/' + id);
    }

    clearUnavailableDys(): Observable<void> {
        return this.http.delete<void>(this.apiUrl);
    }

    addUnavailableDate(date: string): Observable<UnavailableDay> {
        return this.http.post<UnavailableDay>(this.apiUrl, { "date": date });
    }

    markRepairRequestAsAppointmentMade(id: string): Observable<void> {
        return this.http.post<void>(this.apiUrl + '/' + id + '/mark-as-appointment-made', {});
    }
}