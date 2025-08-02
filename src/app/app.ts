import { Component, AfterViewInit, NgModule } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component'

import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-root',
  // standalone: true,
  imports: [ RouterOutlet],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {

}
