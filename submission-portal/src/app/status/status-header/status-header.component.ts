import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

/** Navy page header of the status page: logo, page title and when the request was submitted. */
@Component({
  selector: 'app-status-header',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-header.component.html',
  styleUrl: './status-header.component.css'
})
export class StatusHeaderComponent {
  @Input({ required: true }) title!: string;
  /** e.g. `14 wrz 2026`; `null` while there is no request to show. */
  @Input() submittedOn: string | null = null;
}
