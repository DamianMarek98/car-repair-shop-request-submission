import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { UnavailableDay } from "../models/unavailable-day";

@Injectable({
    providedIn: 'root'
})
export class UnavailableDaysService {
    private apiUrl = 'http://localhost:8080/api/internal/unavailable-day';

    constructor(private http: HttpClient) { }


    getAll(): Observable<UnavailableDay[]> {
        return this.http.get<UnavailableDay[]>(this.apiUrl + "/all");
    }
}