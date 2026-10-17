import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

// Food item interface
export interface Food {
  _id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
}

// Request structure for placing an order
export interface OrderItemRequest {
  foodId: string;
  quantity: number;
}

// Order interface
export interface Order {
  _id: string;
  items: {
    _id?: string;
    foodId: string;
    name: string;
    price: number;
    quantity: number;
  }[];
  totalAmount: number;
  status: 'Pending' | 'Preparing' | 'Ready' | 'Completed' | 'Cancelled';
  createdAt: string;
}

// Response returned by the order API
export interface OrderResponse {
  message: string;
  order: Order;
}

@Injectable({
  providedIn: 'root'
})
export class FoodService {

  private http = inject(HttpClient);

  private apiUrl = 'https://smartbite-backend-lpjd.onrender.com/api/foods';
private orderUrl = 'https://smartbite-backend-lpjd.onrender.com/api/orders';

  // Retrieve available food items
  getFoods(): Observable<Food[]> {
    return this.http.get<Food[]>(this.apiUrl);
  }

  // Place a new order
  placeOrder(items: OrderItemRequest[]): Observable<OrderResponse> {
    return this.http.post<OrderResponse>(this.orderUrl, {
      items
    });
  }

  // Retrieve orders belonging to the logged-in customer
  getOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(`${this.orderUrl}/mine`);
  }

  // Retrieve all customer orders for the administrator
  getAllOrders(): Observable<Order[]> {
    return this.http.get<Order[]>(this.orderUrl);
  }

  // Update the status of an existing order
  updateOrderStatus(
    orderId: string,
    status: Order['status']
  ): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(
      `${this.orderUrl}/${orderId}/status`,
      { status }
    );
  }
    // Cancel an existing customer order
  cancelOrder(orderId: string): Observable<OrderResponse> {
    return this.http.patch<OrderResponse>(
      `${this.orderUrl}/${orderId}/cancel`,
      {}
    );
  }
}