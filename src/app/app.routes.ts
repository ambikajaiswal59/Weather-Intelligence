import { Component } from '@angular/core';
import { MainLayoutComponent } from './layouts/main-layout/main-layout.component';
import { Routes } from '@angular/router';
import { Login } from './pages/login/login';
import { Dashboard } from './pages/dashboard/dashboard';
import { Reports } from './pages/reports/reports';
import { THVS } from './pages/thvs/thvs';
import { authGuard } from './auth/auth-guard';
//import { Home } from './pages/home/home';


export const routes: Routes = [
  { path: '', component: Login },

  {
    path: '',
    component: MainLayoutComponent,
    canActivate: [authGuard],
    children: [
      //{ path: 'home', component: Home },
      { path: 'dashboard', component: Dashboard },

      // REPORT ROUTES
      { path: 'reports/pan-india', component: Reports },
      { path: 'reports/circle-level', component: Reports },
      { path: 'reports/usage', component: Reports },

      // THVS ROUTES
      { path: 'THVS', component: THVS },
    ]
  },
  //{ path: 'home', component: Home, pathMatch: 'full' },
];
