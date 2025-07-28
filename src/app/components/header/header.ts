import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { MapExportService } from '../../shared/map-export.service';
import { HttpClient } from '@angular/common/http';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
  standalone: true
})
export class Header {
   @Input() isDashboard: boolean = false
  showDropdown: boolean = false;
  today: Date = new Date();

  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }
  logout() {
    localStorage.clear();
    window.location.href = '/';
  }
}
