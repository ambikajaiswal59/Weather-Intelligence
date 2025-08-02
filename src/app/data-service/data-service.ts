import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class DataService {
  flaskAPIURL = 'https://mlinfomap.org/weatherapi';
  apiUrl1 = 'http://localhost:6900/api';
  loginApiUrl = 'https://mlinfomap.org/api-drawing-tool';
  telecomService =
    'https://mlinfomap.org/geoserver/Telecom/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=Telecom%3AINDIAN_TELECOM_MAP&outputFormat=application%2Fjson&maxFeatures=1000';

  constructor(private http: HttpClient) {}

  getRequest(): Observable<any> {
    return this.http.get(this.flaskAPIURL);
  }

  postRequest(method: string, payload: Object): Observable<any> {
    return this.http.post(`${this.flaskAPIURL}/${method}`, payload);
  }

  getTowerData(method: string): Observable<any> {
    return this.http.get(`${this.apiUrl1}/${method}`);
  }

  postData(method: string, payload: Object): Observable<any> {
    return this.http.post(`${this.loginApiUrl}/${method}`, payload);
  }
  getFilteredFeatures() {
    return this.http.get<any>(this.telecomService).pipe(
      map((geojson) => {
        const filtered = geojson.features.filter(
          (feature: any) => feature.properties.LGD_STATE === 'UTTAR PRADESH'
        );
        return { ...geojson, features: filtered };
      })
    );
  }
  getWeatherForecast(location: string): Observable<any> {
    
    const apiUrl = 'https://api.weatherapi.com/v1/forecast.json';
    const apiKey = '76458ac302254ce6a1e44038253107';
    return this.http.get(
      `${apiUrl}?key=${apiKey}&q=${location}&days=7&aqi=no&alerts=no`
    );
  }
}








