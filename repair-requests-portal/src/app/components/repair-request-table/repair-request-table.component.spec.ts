import { ComponentFixture, TestBed } from '@angular/core/testing';

import { RepairRequestTableComponent } from './repair-request-table.component';

describe('RepairRequestTableComponent', () => {
  let component: RepairRequestTableComponent;
  let fixture: ComponentFixture<RepairRequestTableComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RepairRequestTableComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(RepairRequestTableComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
