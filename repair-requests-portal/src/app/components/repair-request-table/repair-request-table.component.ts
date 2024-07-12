import { CommonModule } from '@angular/common';
import { AfterViewInit, Component, OnInit, ViewChild } from '@angular/core';
import { MatPaginator, MatPaginatorIntl, PageEvent } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTable, MatTableDataSource, MatTableModule } from '@angular/material/table';
import { Router } from '@angular/router';
import { RepairRequestListItem } from '../../models/repair-request-list-item';
import { RepairRequestService } from '../../service/repair-request-service';
import { StatusMapper } from '../../commons/status-mapper';


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
  pageSize: number = 10;
  numberOfElements: number = 0;
  pageIndex: number = 0;


  constructor(private repairRequestService: RepairRequestService, private router: Router) { }

  @ViewChild(MatPaginator)
  set paginator(value: MatPaginator) {
    if (value) {
      this.dataSource.paginator = value;
      this.dataSource.paginator._intl = new MatPaginatorIntl()
      this.dataSource.paginator._intl.itemsPerPageLabel = "Liczba zgłoszeń na stronie:";
      this.dataSource.paginator._intl.getRangeLabel = (page: number, pageSize: number, length: number) => {
        const start = page * pageSize + 1;
        let end = (page + 1) * pageSize;
        if (end > length) end = length;
        return `${start} - ${end} z ${length}`;
      }
    }
  }

  ngOnInit() {
    this.loadPage({ pageIndex: 0, pageSize: 10 } as PageEvent);
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
    return StatusMapper.mapStatus(status);
  }

  goToDetails(id: string) {
    this.router.navigate(['/repair-request/' + id]);
  }
}