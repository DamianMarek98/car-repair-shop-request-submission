import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { StatusView } from '../status-view';

/** The status card: chip, headline, subline and the three-step timeline. */
@Component({
  selector: 'app-status-summary',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-summary.component.html',
  styleUrl: './status-summary.component.css'
})
export class StatusSummaryComponent {
  @Input({ required: true }) view!: StatusView;
}
