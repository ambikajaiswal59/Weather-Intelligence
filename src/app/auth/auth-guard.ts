import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { DataService } from '../data-service/data-service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  const token = localStorage.getItem('token');
  
  if (token && token !== 'null' && token !== 'undefined') {
    return true;
  } else {
    router.navigate(['/']);
    return false;
  }
};