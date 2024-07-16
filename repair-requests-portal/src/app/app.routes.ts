import { Routes } from '@angular/router';
import { RepairRequestTableComponent } from './components/repair-request-table/repair-request-table.component';
import { RepairRequestSummaryComponent } from './components/repair-request-summary/repair-request-summary.component';
import { LoginComponent } from './components/login/login.component';
import { AuthGuard } from './auth-guard';

export const routes: Routes = [
    { path: 'login', component: LoginComponent },
    { path: 'table', component: RepairRequestTableComponent, canActivate: [AuthGuard] },
    { path: 'repair-request/:id', component: RepairRequestSummaryComponent, canActivate: [AuthGuard] }
];
