import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { ActivatedRoute } from '@angular/router';
import { StatusMapper } from '../../commons/status-mapper';
import { RepairRequest } from '../../models/repair-request';
import { RepairRequestService } from '../../service/repair-request-service';

@Component({
  selector: 'app-repair-request-summary',
  standalone: true,
  imports: [MatCardModule, CommonModule, MatFormFieldModule, MatDividerModule, MatListModule, MatButtonModule],
  providers: [DatePipe],
  templateUrl: './repair-request-summary.component.html',
  styleUrl: './repair-request-summary.component.css'
})
export class RepairRequestSummaryComponent implements OnInit {
  repairRequest: RepairRequest | undefined;
  repairRequestId: string = '';

  @Input()
  set id(id: string) {
    this.repairRequestId = id;
  }

  constructor(private repairRequestService: RepairRequestService, private route: ActivatedRoute, private datePipe: DatePipe) {

  }

  ngOnInit(): void {
    this.loadRepairRequest();
  }

  private loadRepairRequest() {
    this.repairRequestService.getRepairRequest(this.repairRequestId).subscribe(repairRequest => this.repairRequest = repairRequest);
  }

  mapStatus(status: string | undefined): string {
    return StatusMapper.mapStatus(status);
  }

  markRepairRequestAsHandled() {
    this.repairRequestService.markRepairRequestAsHandled(this.repairRequestId).subscribe(() => this.loadRepairRequest());
  }

  markRepairRequestAsAppointmentMade() {
    this.repairRequestService.markRepairRequestAsAppointmentMade(this.repairRequestId).subscribe(() => this.loadRepairRequest());
  }

  mapStatusToColor(status: string | undefined) {
    if (!status) {
      return {};
    }
    return {
      'background-color': StatusMapper.mapStatusToColor(status)
    }
  }

  toBrowserTimeZone(datetime: string | undefined) {
    if (!datetime) {
      return '';
    }
    const adjustedDateString = datetime.replace(/\.\d+/, '');
    const utcDate = new Date(adjustedDateString + 'Z');
    return this.datePipe.transform(utcDate, 'medium', Intl.DateTimeFormat().resolvedOptions().timeZone);
  }
}
