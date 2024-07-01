import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RepairRequestSubmissionComponent } from './repair-request-submission/repair-request-submission.component';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RepairRequestSubmissionComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent {
  title = 'submission-portal';
}
