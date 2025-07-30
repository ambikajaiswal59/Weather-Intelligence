import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject  } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
private locationSubject = new BehaviorSubject<string>('Varanasi,India');
 location$ = this.locationSubject.asObservable(); // observable for other components to subscribe

  setLocation(lat: number, lon: number): void {
    
    const loc = `${lat},${lon}`;
    this.locationSubject.next(loc);
  }
}
