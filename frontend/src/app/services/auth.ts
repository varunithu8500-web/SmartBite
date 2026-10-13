import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, tap } from 'rxjs';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: 'customer' | 'admin';
}

export interface AuthResponse {
  message: string;
  token: string;
  user: AuthUser;
}

export interface RegisterRequest {
  name: string;
  email: string;
  password: string;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  private http = inject(HttpClient);

  private apiUrl = 'http://localhost:3000/api/auth';

  private readonly TOKEN_KEY = 'smartbite_token';
  private readonly USER_KEY = 'smartbite_user';

  currentUser = signal<AuthUser | null>(this.loadStoredUser());

  private token: string | null = sessionStorage.getItem(this.TOKEN_KEY);

  private loadStoredUser(): AuthUser | null {
    try {
      const storedUser = sessionStorage.getItem('smartbite_user');

      if (!storedUser) {
        return null;
      }

      const user = JSON.parse(storedUser) as AuthUser;

      if (
        !user ||
        typeof user.id !== 'string' ||
        typeof user.name !== 'string' ||
        typeof user.email !== 'string' ||
        !['customer', 'admin'].includes(user.role)
      ) {
        sessionStorage.removeItem('smartbite_user');
        return null;
      }

      return user;
    } catch {
      sessionStorage.removeItem('smartbite_user');
      return null;
    }
  }

  register(data: RegisterRequest): Observable<{
    message: string;
    user: AuthUser;
  }> {
    return this.http.post<{
      message: string;
      user: AuthUser;
    }>(
      `${this.apiUrl}/register`,
      data
    );
  }

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(
      `${this.apiUrl}/login`,
      { email, password }
    ).pipe(
      tap(response => {
        this.token = response.token;

        this.currentUser.set(response.user);

        sessionStorage.setItem(this.TOKEN_KEY, response.token);
        sessionStorage.setItem(
          this.USER_KEY,
          JSON.stringify(response.user)
        );
      })
    );
  }

  getToken(): string | null {
    return this.token;
  }

  isLoggedIn(): boolean {
    return this.token !== null;
  }

  isAdmin(): boolean {
    return this.currentUser()?.role === 'admin';
  }

  logout(): void {
    this.token = null;
    this.currentUser.set(null);

    sessionStorage.removeItem(this.TOKEN_KEY);
    sessionStorage.removeItem(this.USER_KEY);
  }
}