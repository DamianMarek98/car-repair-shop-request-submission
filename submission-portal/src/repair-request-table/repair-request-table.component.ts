import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable, MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RepairRequestService } from '../app/services/repair-request-service';
import { RepairRequestListItem } from '../app/models/repair-request-list-item';


@Component({
  selector: 'app-repair-request-table',
  standalone: true,
  imports: [MatTable, MatTableModule, MatPaginator, CommonModule, MatSort],
  templateUrl: './repair-request-table.component.html',
  styleUrl: './repair-request-table.component.css'
})
export class RepairRequestTableComponent implements OnInit {
  displayedColumns: string[] = ['firstName', 'lastName', 'vin', 'status', 'submittedAt'];
  dataSource = new MatTableDataSource<RepairRequestListItem>([]);

  constructor(private repairRequestService: RepairRequestService) { }

  // @ViewChild(MatPaginator) paginator: MatPaginator;
  // @ViewChild(MatSort) sort: MatSort;

  ngOnInit() {
    this.repairRequestService.searchRequests().subscribe(repairRequests => {
      this.dataSource.data = repairRequests;
      this.dataSource._pageData
    })
  }
}
