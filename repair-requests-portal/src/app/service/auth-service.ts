import { HttpClient } from "@angular/common/http";
import { Injectable } from "@angular/core";
import { map, Observable } from "rxjs";

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:8080/api/internal/login';

  constructor(private http: HttpClient) { }

  login(username: string, password: string): Observable<boolean> {
    return this.http.post<{ token: string }>(this.apiUrl, { username, password })
      .pipe(
        map(result => {
          if (this.isBrowser()) {
            localStorage.setItem('access_token', result.token);
            return true;
          }
          return false;
        })
      );
  }

  logout() {
    if (this.isBrowser()) {
      localStorage.removeItem('access_token');
    }
  }

  public get loggedIn(): boolean {
    if (this.isBrowser()) {
      return localStorage.getItem('access_token') !== null;
    }
    return false;
  }

  private isBrowser(): boolean {
    return typeof window !== 'undefined' && typeof localStorage !== 'undefined';
  }
}