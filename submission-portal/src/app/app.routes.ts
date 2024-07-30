import { Routes } from '@angular/router';
import { RepairRequestSubmissionComponent } from './repair-request-submission/repair-request-submission.component';

export const routes: Routes = [
    { path: 'submission', component: RepairRequestSubmissionComponent },
    { path: '', component: RepairRequestSubmissionComponent }
];
