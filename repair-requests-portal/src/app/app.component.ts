import { Component } from '@angular/core';
import { RouterModule, RouterOutlet } from '@angular/router';
import {MatSidenavModule} from '@angular/material/sidenav';
import { MatListModule } from '@angular/material/list';
import { AuthService } from './service/auth-service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, MatSidenavModule, MatListModule, RouterModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'repair-requests-portal';

  constructor(private authService: AuthService) {
  }

  public get loggedIn(): boolean {
    return this.authService.loggedIn;
  }

  public clearToken(): void {
    this.authService.logout();
  }
}
