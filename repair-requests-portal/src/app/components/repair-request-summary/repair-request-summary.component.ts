import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
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
  imports: [MatCardModule, CommonModule, MatFormFieldModule, MatDividerModule, MatListModule, MatButtonModule, MatCheckboxModule],
  providers: [DatePipe],
  templateUrl: './repair-request-summary.component.html',
  styleUrl: './repair-request-summary.component.css'
})
export class RepairRequestSummaryComponent implements OnInit {
  repairRequest: RepairRequest | undefined;
  repairRequestId: string = '';
  sendReviewEmail: boolean = true;
  reviewEmailFailed: boolean = false;

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

  chipClass(status: string | undefined): string {
    return StatusMapper.mapStatusToChipClass(status);
  }

  markRepairRequestAsHandled() {
    this.repairRequestService.markRepairRequestAsHandled(this.repairRequestId).subscribe(() => this.loadRepairRequest());
  }

  markRepairRequestAsAppointmentMade() {
    const requested = this.canSendReviewEmail() && this.sendReviewEmail;
    this.repairRequestService.markRepairRequestAsAppointmentMade(this.repairRequestId, requested)
      .subscribe(result => {
        this.reviewEmailFailed = requested && !result.reviewEmailSent;
        this.loadRepairRequest();
      });
  }

  canSendReviewEmail(): boolean {
    return this.repairRequest?.reviewEmailConsent === true;
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
