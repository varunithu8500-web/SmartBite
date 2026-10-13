import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth';

@Component({
  selector: 'app-register',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.css'
})
export class Register {
  private authService = inject(AuthService);
  private router = inject(Router);

  name = '';
  email = '';
  password = '';
  confirmPassword = '';

  errorMessage = signal('');
  successMessage = signal('');
  isLoading = signal(false);

  onRegister(): void {
    this.errorMessage.set('');
    this.successMessage.set('');

    if (
      !this.name.trim() ||
      !this.email.trim() ||
      !this.password ||
      !this.confirmPassword
    ) {
      this.errorMessage.set('Please complete all fields.');
      return;
    }

    if (this.name.trim().length < 2 || this.name.trim().length > 100) {
      this.errorMessage.set(
        'Name must contain between 2 and 100 characters.'
      );
      return;
    }

    if (this.password.length < 8 || this.password.length > 72) {
      this.errorMessage.set(
        'Password must contain between 8 and 72 characters.'
      );
      return;
    }

    if (this.password !== this.confirmPassword) {
      this.errorMessage.set('Passwords do not match.');
      return;
    }

    this.isLoading.set(true);

    this.authService.register({
      name: this.name.trim(),
      email: this.email.trim(),
      password: this.password
    }).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        this.successMessage.set(response.message);

        // Navigate to login after successful registration.
        setTimeout(() => {
          this.router.navigate(['/login']);
        }, 1000);
      },
      error: (error) => {
        this.isLoading.set(false);
        this.errorMessage.set(
          error.error?.message ||
          'Registration failed. Please try again.'
        );
      }
    });
  }
}