import { Component, OnInit } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import { AuthService } from './service/auth-service';
import { CommonModule } from '@angular/common';
import { Title } from '@angular/platform-browser';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'repair-requests-portal';
  menuOpen = false;

  constructor(private authService: AuthService, private titleService: Title) {
  }

  ngOnInit() {
    this.titleService.setTitle('RENO CAR - Portal');
  }

  public get loggedIn(): boolean {
    return this.authService.loggedIn;
  }

  public clearToken(): void {
    this.authService.logout();
  }

  public toggleMenu(): void {
    this.menuOpen = !this.menuOpen;
  }

  public closeMenu(): void {
    this.menuOpen = false;
  }
}
