import {Component, OnInit} from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { RepairRequestSubmissionComponent } from './repair-request-submission/repair-request-submission.component';
import {Title} from "@angular/platform-browser";

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RepairRequestSubmissionComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css'
})
export class AppComponent implements OnInit {
  title = 'submission-portal';

  constructor(private titleService: Title) {
  }

  ngOnInit() {
    this.titleService.setTitle('RENO CAR - Umów się');
  }
}
