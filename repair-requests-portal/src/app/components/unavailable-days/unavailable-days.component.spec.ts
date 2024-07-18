import { ComponentFixture, TestBed } from '@angular/core/testing';

import { UnavailableDaysComponent } from './unavailable-days.component';

describe('UnavailableDaysComponent', () => {
  let component: UnavailableDaysComponent;
  let fixture: ComponentFixture<UnavailableDaysComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [UnavailableDaysComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(UnavailableDaysComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
