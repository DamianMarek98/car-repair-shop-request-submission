import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RepairRequestStatus } from '../../models/repair-request-status';
import { StatusView } from '../status-view';

/**
 * "Szczegóły zgłoszenia" card. Read-only; VIN, phone and e-mail come masked from the API and are
 * shown as received.
 */
@Component({
  selector: 'app-status-details',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './status-details.component.html',
  styleUrl: './status-details.component.css'
})
export class StatusDetailsComponent {
  @Input({ required: true }) request!: RepairRequestStatus;
  @Input({ required: true }) view!: StatusView;
}
