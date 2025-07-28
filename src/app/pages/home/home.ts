import { Component } from '@angular/core';
import { Header } from '../../components/header/header';
import { WeatherMap } from "../../components/weather-map/weather-map";
import { Zone } from "../../components/zone/zone";
import { Severity } from "../../components/severity/severity"
import { HttpClientModule } from '@angular/common/http';

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [HttpClientModule,Header, WeatherMap, Zone, Severity],
  templateUrl: './home.html',
  styleUrl: './home.css'
})
export class Home {

}
