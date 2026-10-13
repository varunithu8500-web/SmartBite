import { Component, OnInit, inject, signal } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Router } from '@angular/router';

import {
  FoodService,
  Food,
  Order,
  OrderResponse
} from '../services/food';

import { AuthService } from '../services/auth';

interface CartItem {
  food: Food;
  quantity: number;
}

@Component({
  selector: 'app-customer',
  standalone: true,
  imports: [DatePipe],
  templateUrl: './customer.html',
  styleUrl: './customer.css'
})
export class Customer implements OnInit {

  private foodService = inject(FoodService);
  private authService = inject(AuthService);
  private router = inject(Router);

  // Food menu
  foods = signal<Food[]>([]);
  errorMessage = signal('');

  // Shopping cart
  cartItems = signal<CartItem[]>([]);

  // Customer order history
  orders = signal<Order[]>([]);
  isLoadingOrders = signal(false);
  orderHistoryError = signal('');
  orderStatusMessage = signal('');

  // Order placement
  isPlacingOrder = signal(false);
  orderMessage = signal('');
  orderError = signal('');

  // Authentication helpers
  isLoggedIn(): boolean {
    return this.authService.isLoggedIn();
  }

  getCustomerName(): string {
    return this.authService.currentUser()?.name ?? '';
  }

  // Log out the current customer
  logout(): void {
    this.authService.logout();

    this.orders.set([]);
    this.orderHistoryError.set('');
    this.orderStatusMessage.set('');
    this.orderMessage.set('');
    this.orderError.set('');

    this.router.navigate(['/login']);
  }

  ngOnInit(): void {
    // Everyone can browse the food menu.
    this.loadFoods();

    // Only authenticated users can load order history.
    if (this.authService.isLoggedIn()) {
      this.loadOrders();
    }
  }

  // Load available food items
  loadFoods(): void {
    this.errorMessage.set('');

    this.foodService.getFoods().subscribe({
      next: data => {
        this.foods.set(data);
      },
      error: error => {
        console.error('Failed to load food items:', error);

        this.errorMessage.set(
          'Unable to load food items. Please try again later.'
        );
      }
    });
  }

  // Load the logged-in customer's order history
  loadOrders(): void {
    if (!this.authService.isLoggedIn()) {
      this.orders.set([]);
      this.isLoadingOrders.set(false);
      this.orderHistoryError.set('');
      return;
    }

    this.isLoadingOrders.set(true);
    this.orderHistoryError.set('');

    this.foodService.getOrders().subscribe({
      next: data => {
        this.orders.set(data);
        this.isLoadingOrders.set(false);
      },
      error: error => {
        console.error('Failed to load orders:', error);

        this.orderHistoryError.set(
          error.error?.message ||
          'Unable to load order history. Please try again later.'
        );

        this.isLoadingOrders.set(false);

        if (error.status === 401) {
          this.authService.logout();
          this.orders.set([]);
          this.router.navigate(['/login']);
        }
      }
    });
  }

  // Add food to the cart
  addToCart(food: Food): void {
    this.clearOrderMessages();

    this.cartItems.update(items => {
      const existing = items.find(
        item => item.food._id === food._id
      );

      if (existing) {
        return items.map(item =>
          item.food._id === food._id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }

      return [...items, { food, quantity: 1 }];
    });
  }

  // Increase item quantity
  increaseQuantity(foodId: string): void {
    this.clearOrderMessages();

    this.cartItems.update(items =>
      items.map(item =>
        item.food._id === foodId
          ? { ...item, quantity: item.quantity + 1 }
          : item
      )
    );
  }

  // Decrease item quantity
  decreaseQuantity(foodId: string): void {
    this.clearOrderMessages();

    this.cartItems.update(items =>
      items
        .map(item =>
          item.food._id === foodId
            ? { ...item, quantity: item.quantity - 1 }
            : item
        )
        .filter(item => item.quantity > 0)
    );
  }

  // Remove an item from the cart
  removeFromCart(foodId: string): void {
    this.clearOrderMessages();

    this.cartItems.update(items =>
      items.filter(item => item.food._id !== foodId)
    );
  }

  // Calculate cart total
  getCartTotal(): number {
    return this.cartItems().reduce(
      (total, item) =>
        total + item.food.price * item.quantity,
      0
    );
  }

  // Calculate total quantity in the cart
  getCartQuantity(): number {
    return this.cartItems().reduce(
      (total, item) => total + item.quantity,
      0
    );
  }

  // Place an order
  placeOrder(): void {

    // Require authentication before placing an order.
    if (!this.authService.isLoggedIn()) {
      this.router.navigate(['/login']);
      return;
    }

    if (
      this.cartItems().length === 0 ||
      this.isPlacingOrder()
    ) {
      return;
    }

    this.clearOrderMessages();

    const items = this.cartItems().map(item => ({
      foodId: item.food._id,
      quantity: item.quantity
    }));

    this.isPlacingOrder.set(true);

    this.foodService.placeOrder(items).subscribe({
      next: (response: OrderResponse) => {
        this.orderMessage.set(
          `${response.message} Order ID: ${response.order._id}`
        );

        this.orderError.set('');
        this.cartItems.set([]);
        this.isPlacingOrder.set(false);

        // Refresh the customer's order history.
        this.loadOrders();
      },

      error: error => {
        console.error('Failed to place order:', error);

        this.orderError.set(
          error.error?.message ||
          'Unable to place your order. Please try again.'
        );

        this.isPlacingOrder.set(false);

        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login']);
        }
      }
    });
  }

  // Clear order confirmation and error messages
  private clearOrderMessages(): void {
    this.orderMessage.set('');
    this.orderError.set('');
  }
}