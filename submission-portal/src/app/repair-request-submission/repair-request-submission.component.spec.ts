import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepairRequestSubmissionComponent } from './repair-request-submission.component';

describe('RepairRequestSubmissionComponent', () => {
  let component: RepairRequestSubmissionComponent;
  let fixture: ComponentFixture<RepairRequestSubmissionComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepairRequestSubmissionComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RepairRequestSubmissionComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
