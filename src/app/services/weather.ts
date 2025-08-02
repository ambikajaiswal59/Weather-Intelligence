import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject  } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {
private locationSubject = new BehaviorSubject<string>('Varanasi,India');
 private selectedLayerSubject = new BehaviorSubject<string>('');
 location$ = this.locationSubject.asObservable(); // observable for other components to subscribe
 selectedLayer$ = this.selectedLayerSubject.asObservable();

  setLocation(lat: number, lon: number): void {
    
    const loc = `${lat},${lon}`;
    this.locationSubject.next(loc);
  }
  setSelectedLayer(layer: string) {
    this.selectedLayerSubject.next(layer);
  }

  clearSelectedLayer() {
    this.selectedLayerSubject.next('');
  }
}
