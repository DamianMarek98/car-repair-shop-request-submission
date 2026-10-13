import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnDestroy, OnInit } from '@angular/core';
import { Meta, Title } from '@angular/platform-browser';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Subscription } from 'rxjs';
import { RepairRequestStatus } from '../models/repair-request-status';
import { StatusService } from '../services/status-service';
import { StatusDetailsComponent } from './status-details/status-details.component';
import { StatusFooterComponent } from './status-footer/status-footer.component';
import { StatusHeaderComponent } from './status-header/status-header.component';
import { StatusSummaryComponent } from './status-summary/status-summary.component';
import { buildStatusView, StatusView } from './status-view';

type PageState = 'loading' | 'ready' | 'not-found' | 'error';

/** Shape of the tracking token (32 random bytes, base64url). Anything else cannot exist - don't ask the API. */
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/;
const PAGE_TITLE = 'Status zgłoszenia — RENO CAR';
const ROBOTS_SELECTOR = 'name="robots"';

/**
 * Customer's status page, opened from the link in their e-mails (`/status/:token`). Read-only.
 * The token is the only credential, so the page must never be indexed.
 */
@Component({
  selector: 'app-status',
  standalone: true,
  imports: [CommonModule, RouterLink, StatusHeaderComponent, StatusFooterComponent, StatusSummaryComponent,
    StatusDetailsComponent],
  templateUrl: './status.component.html',
  styleUrl: './status.component.css'
})
export class StatusComponent implements OnInit, OnDestroy {
  state: PageState = 'loading';
  request: RepairRequestStatus | null = null;
  view: StatusView | null = null;

  private token: string | null = null;
  private previousTitle = '';
  private routeSubscription?: Subscription;
  private requestSubscription?: Subscription;

  constructor(private route: ActivatedRoute, private statusService: StatusService,
    private title: Title, private meta: Meta) { }

  ngOnInit(): void {
    // AppComponent sets the form's title for every route; this page needs its own
    this.previousTitle = this.title.getTitle();
    this.title.setTitle(PAGE_TITLE);
    this.meta.updateTag({ name: 'robots', content: 'noindex,nofollow' });

    this.routeSubscription = this.route.paramMap.subscribe(params => {
      this.token = params.get('token');
      this.load();
    });
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.requestSubscription?.unsubscribe();
    this.meta.removeTag(ROBOTS_SELECTOR);
    this.title.setTitle(this.previousTitle);
  }

  load(): void {
    this.requestSubscription?.unsubscribe();
    if (!this.token || !TOKEN_PATTERN.test(this.token)) {
      this.state = 'not-found';
      return;
    }

    this.state = 'loading';
    this.requestSubscription = this.statusService.getStatus(this.token).subscribe({
      next: request => this.show(request),
      // only a 404 means "no such link"; anything else is a failure worth retrying
      error: (error: HttpErrorResponse) => this.state = error.status === 404 ? 'not-found' : 'error'
    });
  }

  private show(request: RepairRequestStatus): void {
    const view = buildStatusView(request);
    if (!view) {
      this.state = 'error';
      return;
    }
    this.request = request;
    this.view = view;
    this.state = 'ready';
  }
}
