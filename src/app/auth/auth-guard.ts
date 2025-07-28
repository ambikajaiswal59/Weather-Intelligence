import { inject } from '@angular/core';
import { CanActivateFn } from '@angular/router';
import { Router } from '@angular/router';
import { DataService } from '../data-service/data-service';

export const authGuard: CanActivateFn = (route, state) => {
  const router = inject(Router);
  // const authService = inject(DataService);
  const token = localStorage.getItem('token');
  // const token = 'iuyw3ri7'
  if (token) {
    return true;
  } else {
    router.navigate(['/']);
    return false;
  }
};
