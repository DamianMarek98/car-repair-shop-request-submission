import { Routes } from '@angular/router';
import { RepairRequestSubmissionComponent } from './repair-request-submission/repair-request-submission.component';
import { StatusComponent } from './status/status.component';

export const routes: Routes = [
    { path: 'submission', component: RepairRequestSubmissionComponent },
    // customer's status page, opened from the link in their e-mails; without a token it shows "link invalid"
    { path: 'status/:token', component: StatusComponent },
    { path: 'status', component: StatusComponent },
    { path: '', component: RepairRequestSubmissionComponent }
];
