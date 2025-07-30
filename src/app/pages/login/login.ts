import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { DataService } from '../../data-service/data-service';
import { catchError } from 'rxjs/operators';
import { throwError } from 'rxjs';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';

@Component({
  selector: 'app-login',
  imports: [FormsModule, CommonModule],
  templateUrl: './login.html',
  styleUrls: ['./login.css'], // ✅ fixed typo
})
export class Login {
  email: string = '';
  password: string = '';
  errorMessage: string = '';
  constructor(private dataService: DataService, private router: Router) {}

  handleLogin() {
    const params = {
      username: this.email,
      userpassword: this.password,
    };

    this.dataService
      .postData(`userLogin`, params)
      .pipe(
        catchError((error) => {
          const errorMessage =
            error?.error?.message || 'Login failed. Please try again.';
          alert(errorMessage);
          return throwError(() => error);
        })
      )
      .subscribe((res: any) => {
        console.log('Login Response:', res);
        if (res?.token) {
          localStorage.setItem('user', JSON.stringify(res.resultUser));
          localStorage.setItem('token', res.token); // no stringify!
          this.router.navigate(['/dashboard']),{
            queryParams: { from: 'login' }
          }
        } else {
          alert('Invalid login response');
        }
      });
  }
}
