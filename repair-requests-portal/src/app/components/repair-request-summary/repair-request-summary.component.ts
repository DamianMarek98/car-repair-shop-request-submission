import { Component, Input, OnInit } from '@angular/core';
import { RepairRequestService } from '../../service/repair-request-service';
import { RepairRequest } from '../../models/repair-request';
import {MatCardModule} from '@angular/material/card';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Route } from '@angular/router';
import { StatusMapper } from '../../commons/status-mapper';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatDividerModule } from '@angular/material/divider';
import {MatListModule} from '@angular/material/list';

@Component({
  selector: 'app-repair-request-summary',
  standalone: true,
  imports: [MatCardModule, CommonModule, MatFormFieldModule, MatDividerModule, MatListModule],
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

  constructor(private repairRequestService: RepairRequestService, private route: ActivatedRoute) {

  }

  ngOnInit(): void {
    const id = String(this.route.snapshot.paramMap.get('id'));
    this.repairRequestService.getRepairRequest(this.repairRequestId).subscribe(repairRequest => this.repairRequest = repairRequest);
  }

  mapStatus(status: string | undefined): string {
    return StatusMapper.mapStatus(status);
  }
}
