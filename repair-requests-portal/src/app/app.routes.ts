import { Routes } from '@angular/router';
import { RepairRequestTableComponent } from './components/repair-request-table/repair-request-table.component';
import { RepairRequestSummaryComponent } from './components/repair-request-summary/repair-request-summary.component';
import { LoginComponent } from './components/login/login.component';
import { AuthGuard } from './auth-guard';
import { UnavailableDaysComponent } from './components/unavailable-days/unavailable-days.component';

export const routes: Routes = [
    { path: 'login-component', component: LoginComponent },
    { path: 'table-component', component: RepairRequestTableComponent, canActivate: [AuthGuard] },
    { path: '', component: RepairRequestTableComponent, canActivate: [AuthGuard] },
    { path: 'repair-request/:id', component: RepairRequestSummaryComponent, canActivate: [AuthGuard] },
    { path: 'unavailable-days', component: UnavailableDaysComponent, canActivate: [AuthGuard] },
    // lazy: keeps Material table/select/dialog out of the initial bundle (the build fails at 1 MB)
    { path: 'team', loadComponent: () => import('./components/team/team.component').then(m => m.TeamComponent), canActivate: [AuthGuard] },
    { path: 'leaves', loadComponent: () => import('./components/leave-calendar/leave-calendar.component').then(m => m.LeaveCalendarComponent), canActivate: [AuthGuard] }
];
