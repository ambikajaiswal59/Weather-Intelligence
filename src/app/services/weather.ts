import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WeatherService {

  private apiUrl = 'https://api.weatherapi.com/v1/forecast.json';
  private apiKey = '6e28b1d11b314f5db2b43257251707';

  constructor(private http: HttpClient) {}

  getForecast(location: string): Observable<any> {
    debugger
    return this.http.get(`${this.apiUrl}?key=${this.apiKey}&q=${location}&days=7&aqi=no&alerts=no`);
  }
}
