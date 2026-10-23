import { isPlatformBrowser } from '@angular/common';
import { Component, Inject, Input, OnChanges, PLATFORM_ID } from '@angular/core';
import { RouterLink } from '@angular/router';
import { daysLabel } from '../../commons/days-label';
import { formatPl, POLISH_MONTHS, POLISH_MONTHS_SHORT } from '../../commons/iso-date';
import { teamErrorMessage } from '../../commons/team-error-messages';
import { ReportLeaveStatus, YearReport } from '../../models/year-report';
import { TeamService } from '../../service/team-service';

/** The year the planning tool went live: its pool is "days left at go-live", not a full year (plan §3.5). */
export const GO_LIVE_YEAR = 2026;

export const STATUS_LABELS: Record<ReportLeaveStatus, string> = {
  TAKEN: 'Wykorzystany',
  IN_PROGRESS: 'W trakcie',
  PLANNED: 'Zaplanowany',
};

/**
 * Raport roczny (plan §4.3 / §5): one employee's year on one printable page. Every number comes from
 * the backend's report, which uses the same calculator as the Zespół table. Route: `team/:id/report?year=`.
 */
@Component({
  selector: 'app-year-report',
  standalone: true,
  // plain buttons on purpose: importing MatButtonModule here grew the *initial* bundle by ~18 kB
  // (esbuild re-split shared Material code) - measured 2026-10-18
  imports: [RouterLink],
  templateUrl: './year-report.component.html',
  styleUrl: './year-report.component.css'
})
export class YearReportComponent implements OnChanges {
  /** route parameter `:id` */
  @Input() id = '';
  /** query parameter `?year=`; the backend's current year when missing */
  @Input() year?: string;

  readonly daysLabel = daysLabel;
  readonly formatPl = formatPl;
  readonly months = POLISH_MONTHS;
  readonly monthsShort = POLISH_MONTHS_SHORT;
  readonly statusLabels = STATUS_LABELS;

  report: YearReport | null = null;
  error = '';

  constructor(private teamService: TeamService, @Inject(PLATFORM_ID) private platformId: object) {
  }

  ngOnChanges(): void {
    const year = Number(this.year);
    this.error = '';
    // no usable ?year= -> let the backend pick its current year (never the browser clock)
    this.teamService.report(this.id, this.year && Number.isInteger(year) ? year : undefined).subscribe({
      next: report => this.report = report,
      error: error => this.error = teamErrorMessage(error),
    });
  }

  get isGoLiveYear(): boolean {
    return this.report?.year === GO_LIVE_YEAR;
  }

  get monthsTotal(): number {
    return this.report?.months.reduce((sum, days) => sum + days, 0) ?? 0;
  }

  print(): void {
    if (isPlatformBrowser(this.platformId)) {
      window.print();
    }
  }
}
