import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import { MapExportService } from '../../shared/map-export.service';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.html',
  styleUrl: './header.css',
  standalone: true,
})
export class Header {
  @Input() isDashboard: boolean = false;
  showDropdown: boolean = false;
  today: Date = new Date();
  constructor(private router: Router) {}
  toggleDropdown() {
    this.showDropdown = !this.showDropdown;
  }

logout(): void {
  localStorage.removeItem('token');
  localStorage.removeItem('user');
  this.router.navigate(['/']);
}
}
