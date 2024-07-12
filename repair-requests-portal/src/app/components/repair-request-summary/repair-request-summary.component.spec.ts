import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepairRequestSummaryComponent } from './repair-request-summary.component';

describe('RepairRequestSummaryComponent', () => {
  let component: RepairRequestSummaryComponent;
  let fixture: ComponentFixture<RepairRequestSummaryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepairRequestSummaryComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RepairRequestSummaryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
