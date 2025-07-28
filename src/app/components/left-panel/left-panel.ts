import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-left-panel',
  imports: [CommonModule, RouterModule],
  standalone: true,
  templateUrl: './left-panel.html',
  styleUrl: './left-panel.css'
})
export class LeftPanel {
showReports: boolean = false;

toggleReports(event: Event) {
 
  event.preventDefault();
  this.showReports = !this.showReports;
}
}
