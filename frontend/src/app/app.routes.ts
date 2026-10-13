import { Routes } from '@angular/router';
import { Admin } from './admin/admin';
import { Customer } from './customer/customer';
import { Login } from './auth/login/login';
import { Register } from './auth/register/register';

export const routes: Routes = [
  { path: '', component: Customer },
  { path: 'login', component: Login },
  { path: 'register', component: Register },
  { path: 'admin', component: Admin },
  { path: '**', redirectTo: '' }
];