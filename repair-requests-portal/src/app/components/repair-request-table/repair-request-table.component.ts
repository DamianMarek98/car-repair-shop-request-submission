import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable, MatTableDataSource, MatTableModule } from '@angular/material/table';
import { RepairRequestService } from '../../service/repair-request-service';
import { RepairRequestListItem } from '../../models/repair-request-list-item';


@Component({
  selector: 'app-repair-request-table',
  standalone: true,
  imports: [MatTable, MatTableModule, MatPaginator, CommonModule, MatSort],
  templateUrl: './repair-request-table.component.html',
  styleUrl: './repair-request-table.component.css'
})
export class RepairRequestTableComponent implements OnInit, AfterViewInit {
  displayedColumns: string[] = ['firstName', 'lastName', 'vin', 'status', 'submittedAt'];
  dataSource = new MatTableDataSource<RepairRequestListItem>([]);
  pageSize: number = 25;
  numberOfElements: number = 0;
  pageIndex: number = 0;


  constructor(private repairRequestService: RepairRequestService) { }

  @ViewChild(MatPaginator) 
  set paginator(value: MatPaginator) {
    this.dataSource.paginator = value;
  }

  ngOnInit() {
    this.loadPage({pageIndex: 0, pageSize: 25} as PageEvent);
  }
  
  loadPage(event: PageEvent) {
    this.repairRequestService.searchRequests(event.pageIndex, event.pageSize).subscribe(repairRequestsPage => {
      this.dataSource.data = repairRequestsPage.content;
      this.numberOfElements = repairRequestsPage.totalElements;
    });
  }

  ngAfterViewInit() {
    this.dataSource.paginator = this.paginator;
  }

  mapStatus(status: string): string {
    if (status === 'NEW') {
      return 'NOWE';
    } else if (status === 'APPOINTMENT_MADE') {
      return 'UMÓWIONO';
    } else if (status === 'HANDLED') {
      return 'ZAKOŃCZONO';
    }

    return 'NIEZNANY'
  }
}