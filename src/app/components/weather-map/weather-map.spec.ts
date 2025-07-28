import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WeatherMap } from './weather-map';

describe('WeatherMap', () => {
  let component: WeatherMap;
  let fixture: ComponentFixture<WeatherMap>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeatherMap]
    })
    .compileComponents();

    fixture = TestBed.createComponent(WeatherMap);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
