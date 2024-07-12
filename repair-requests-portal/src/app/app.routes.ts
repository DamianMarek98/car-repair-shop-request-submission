import { Routes } from '@angular/router';
import { RepairRequestTableComponent } from './components/repair-request-table/repair-request-table.component';
import { RepairRequestSummaryComponent } from './components/repair-request-summary/repair-request-summary.component';

export const routes: Routes = [
    { path: 'table', component: RepairRequestTableComponent },
    { path: 'repair-request/:id', component: RepairRequestSummaryComponent }
];
