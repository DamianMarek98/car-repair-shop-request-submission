import { CommonModule, DatePipe } from '@angular/common';
import { Component, Input, OnInit } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { ActivatedRoute } from '@angular/router';
import { StatusMapper } from '../../commons/status-mapper';
import { RepairRequest } from '../../models/repair-request';
import { RepairRequestService } from '../../service/repair-request-service';

@Component({
  selector: 'app-repair-request-summary',
  standalone: true,
  imports: [MatCardModule, CommonModule, MatFormFieldModule, MatDividerModule, MatListModule, MatButtonModule, MatCheckboxModule, MatProgressSpinner],
  providers: [DatePipe],
  templateUrl: './repair-request-summary.component.html',
  styleUrl: './repair-request-summary.component.css'
})
export class RepairRequestSummaryComponent implements OnInit {
  repairRequest: RepairRequest | undefined;
  repairRequestId: string = '';
  sendReviewEmail: boolean = true;
  reviewEmailFailed: boolean = false;
  actionInProgress: boolean = false;
  actionFailed: boolean = false;

  @Input()
  set id(id: string) {
    this.repairRequestId = id;
  }

  constructor(private repairRequestService: RepairRequestService, private route: ActivatedRoute, private datePipe: DatePipe) {

  }

  ngOnInit(): void {
    this.loadRepairRequest();
  }

  private loadRepairRequest(done?: () => void) {
    this.repairRequestService.getRepairRequest(this.repairRequestId).subscribe({
      next: repairRequest => {
        this.repairRequest = repairRequest;
        done?.();
      },
      error: () => done?.()
    });
  }

  mapStatus(status: string | undefined): string {
    return StatusMapper.mapStatus(status);
  }

  chipClass(status: string | undefined): string {
    return StatusMapper.mapStatusToChipClass(status);
  }

  markRepairRequestAsHandled() {
    if (this.actionInProgress) {
      return;
    }
    this.startAction();
    this.repairRequestService.markRepairRequestAsHandled(this.repairRequestId).subscribe({
      next: () => this.finishAction(),
      error: () => this.failAction()
    });
  }

  markRepairRequestAsAppointmentMade() {
    if (this.actionInProgress) {
      return;
    }
    const requested = this.canSendReviewEmail() && this.sendReviewEmail;
    this.startAction();
    this.repairRequestService.markRepairRequestAsAppointmentMade(this.repairRequestId, requested)
      .subscribe({
        next: result => {
          this.reviewEmailFailed = requested && !result.reviewEmailSent;
          this.finishAction();
        },
        error: () => this.failAction()
      });
  }

  private startAction() {
    this.actionInProgress = true;
    this.actionFailed = false;
    this.reviewEmailFailed = false;
  }

  /**
   * Stays busy until the refreshed request is on screen, so the button cannot be pressed again
   * while the status shown is still the old one. A failing refresh must not be reported as a
   * failed action — the transition already happened server-side and retrying it could send a
   * second review e-mail.
   */
  private finishAction() {
    this.loadRepairRequest(() => this.actionInProgress = false);
  }

  private failAction() {
    this.actionInProgress = false;
    this.actionFailed = true;
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
