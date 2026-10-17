import { Component, OnInit, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DatePipe, CurrencyPipe } from '@angular/common';
import { FoodService, Order } from '../services/food';
import { BaseChartDirective } from 'ng2-charts';
import { Chart, registerables, ChartConfiguration, ChartType } from 'chart.js';

interface Food {
  _id: string;
  name: string;
  price: number;
  category: string;
  available: boolean;
}

@Component({
  selector: 'app-admin',
  imports: [DatePipe, CurrencyPipe, BaseChartDirective],
  templateUrl: './admin.html',
  styleUrl: './admin.css'
})
export class Admin implements OnInit {

  static {
    Chart.register(...registerables);
  }

  private http = inject(HttpClient);
  private foodService = inject(FoodService);

  // ==========================================
  // FOOD MANAGEMENT
  // ==========================================

  foods = signal<Food[]>([]);
  errorMessage = signal('');

  // Add Food form
  foodName = signal('');
  foodPrice = signal<number | null>(null);
  foodCategory = signal('');
  addFoodMessage = signal('');
  isAddingFood = signal(false);

  // Edit Food form
  editingFoodId = signal<string | null>(null);
  editFoodName = signal('');
  editFoodPrice = signal<number | null>(null);
  editFoodCategory = signal('');
  editFoodMessage = signal('');
  isUpdatingFood = signal(false);

  // ==========================================
  // ORDER MANAGEMENT
  // ==========================================

  orders = signal<Order[]>([]);
  isLoadingOrders = signal(false);

  orderErrorMessage = signal('');
  orderSuccessMessage = signal('');

  selectedOrderStatus = signal('All');
  updatingOrderIds = signal<string[]>([]);

  readonly orderStatuses = [
    'All',
    'Pending',
    'Preparing',
    'Ready',
    'Completed',
    'Cancelled'
  ];

  // Order status doughnut chart
 readonly orderChartType: 'doughnut' = 'doughnut';
  orderChartData: ChartConfiguration<'doughnut'>['data'] = {
    labels: ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'],
    datasets: [
      {
        label: 'Orders',
        data: [0, 0, 0, 0, 0]
      }
    ]
  };

  readonly orderChartOptions: ChartConfiguration<'doughnut'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom'
      },
      title: {
        display: true,
        text: 'Orders by Status'
      }
    }
  };

  // Daily orders bar chart for the last seven calendar days
  readonly dailyChartType: 'bar' = 'bar';

  dailyChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Orders per Day',
        data: [],
        backgroundColor: '#36A2EB',
        borderColor: '#2589C7',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  readonly dailyChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Daily Orders - Last 7 Days'
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          stepSize: 1
        },
        title: {
          display: true,
          text: 'Number of Orders'
        }
      },
      x: {
        title: {
          display: true,
          text: 'Date'
        }
      }
    }
  };

  // Top 5 most ordered food items, ranked by total quantity ordered.
  readonly popularFoodChartType: 'bar' = 'bar';

  popularFoodChartData: ChartConfiguration<'bar'>['data'] = {
    labels: [],
    datasets: [
      {
        label: 'Quantity Ordered',
        data: [],
        backgroundColor: '#42A5F5',
        borderColor: '#1E88E5',
        borderWidth: 1,
        borderRadius: 6
      }
    ]
  };

  readonly popularFoodChartOptions: ChartConfiguration<'bar'>['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    indexAxis: 'y',
    plugins: {
      legend: {
        display: false
      },
      title: {
        display: true,
        text: 'Top 5 Most Ordered Food Items'
      }
    },
    scales: {
      x: {
        beginAtZero: true,
        ticks: {
          precision: 0,
          stepSize: 1
        },
        title: {
          display: true,
          text: 'Total Quantity Ordered'
        }
      },
      y: {
        title: {
          display: true,
          text: 'Food Item'
        }
      }
    }
  };

  // Initialize admin dashboard
  ngOnInit(): void {
    this.loadFoods();
    this.loadOrders();
  }

  // ==========================================
  // FOOD METHODS
  // ==========================================

  // Retrieve all food items
  loadFoods(): void {
    this.http.get<Food[]>(
      'https://smartbite-backend-lpjd.onrender.com/api/admin/foods'
    ).subscribe({
      next: foods => {
        this.foods.set(foods);
        this.errorMessage.set('');
      },
      error: error => {
        console.error('Failed to load food items:', error);
        this.errorMessage.set('Unable to load food items.');
      }
    });
  }

  // Convert input text into a number
  toNumber(value: string): number | null {
    if (value.trim() === '') {
      return null;
    }

    const number = Number(value);

    return Number.isFinite(number) ? number : null;
  }

  // Add a new food item
  addFood(): void {
    const name = this.foodName().trim();
    const price = this.foodPrice();
    const category = this.foodCategory().trim();

    this.addFoodMessage.set('');

    if (
      !name ||
      price === null ||
      !Number.isFinite(price) ||
      price < 0 ||
      !category
    ) {
      this.addFoodMessage.set(
        'Enter a valid name, a non-negative price, and a category.'
      );
      return;
    }

    if (this.isAddingFood()) {
      return;
    }

    this.isAddingFood.set(true);

    this.http.post<{
      message: string;
      food: Food;
    }>(
      'https://smartbite-backend-lpjd.onrender.com/api/foods',
      { name, price, category }
    ).subscribe({
      next: response => {
        this.addFoodMessage.set(
          response.message || 'Food item added successfully!'
        );

        this.foodName.set('');
        this.foodPrice.set(null);
        this.foodCategory.set('');

        this.isAddingFood.set(false);
        this.loadFoods();
      },
      error: error => {
        console.error('Failed to add food item:', error);

        this.addFoodMessage.set(
          error.error?.message || 'Unable to add food item.'
        );

        this.isAddingFood.set(false);
      }
    });
  }

  // Open the edit form
  startEditing(food: Food): void {
    this.editingFoodId.set(food._id);
    this.editFoodName.set(food.name);
    this.editFoodPrice.set(food.price);
    this.editFoodCategory.set(food.category);
    this.editFoodMessage.set('');
  }

  // Cancel editing
  cancelEditing(): void {
    this.editingFoodId.set(null);
    this.editFoodName.set('');
    this.editFoodPrice.set(null);
    this.editFoodCategory.set('');
    this.editFoodMessage.set('');
    this.isUpdatingFood.set(false);
  }

  // Update an existing food item
  updateFood(): void {
    const id = this.editingFoodId();
    const name = this.editFoodName().trim();
    const price = this.editFoodPrice();
    const category = this.editFoodCategory().trim();

    this.editFoodMessage.set('');

    if (!id) {
      this.editFoodMessage.set(
        'No food item selected for editing.'
      );
      return;
    }

    if (
      !name ||
      price === null ||
      !Number.isFinite(price) ||
      price < 0 ||
      !category
    ) {
      this.editFoodMessage.set(
        'Enter a valid name, a non-negative price, and a category.'
      );
      return;
    }

    if (this.isUpdatingFood()) {
      return;
    }

    this.isUpdatingFood.set(true);

    this.http.put<{
      message: string;
      food: Food;
    }>(
      `https://smartbite-backend-lpjd.onrender.com/api/foods/${id}`,
      { name, price, category }
    ).subscribe({
      next: response => {
        this.editFoodMessage.set(
          response.message || 'Food item updated successfully!'
        );

        this.isUpdatingFood.set(false);
        this.cancelEditing();
        this.loadFoods();
      },
      error: error => {
        console.error('Failed to update food item:', error);

        this.editFoodMessage.set(
          error.error?.message || 'Unable to update food item.'
        );

        this.isUpdatingFood.set(false);
      }
    });
  }

  // Toggle food availability
  toggleAvailability(food: Food): void {
    const newAvailability = !food.available;

    this.errorMessage.set('');

    this.http.patch<{
      message: string;
      food: Food;
    }>(
      `https://smartbite-backend-lpjd.onrender.com/api/foods/${food._id}/availability`,
      { available: newAvailability }
    ).subscribe({
      next: () => {
        this.loadFoods();
      },
      error: error => {
        console.error('Failed to update availability:', error);

        this.errorMessage.set(
          error.error?.message ||
          'Unable to update food availability. Please try again.'
        );
      }
    });
  }

  // Count available food items
  getAvailableCount(): number {
    return this.foods().filter(
      food => food.available
    ).length;
  }

  // Delete a food item
  deleteFood(food: Food): void {
    const confirmed = confirm(
      `Are you sure you want to delete "${food.name}"?`
    );

    if (!confirmed) {
      return;
    }

    this.errorMessage.set('');

    this.http.delete<{ message: string }>(
      `https://smartbite-backend-lpjd.onrender.com/api/foods/${food._id}`
    ).subscribe({
      next: response => {
        alert(response.message);
        this.loadFoods();
      },
      error: error => {
        console.error('Failed to delete food item:', error);

        this.errorMessage.set(
          error.error?.message || 'Unable to delete food item.'
        );
      }
    });
  }

  // ==========================================
  // ORDER METHODS
  // ==========================================

  // Retrieve orders from the backend
  // Retrieve all customer orders for the admin dashboard.
loadOrders(): void {
  this.isLoadingOrders.set(true);
  this.orderErrorMessage.set('');

  this.foodService.getAllOrders().subscribe({
    next: orders => {
      this.orders.set(orders);
      this.updateOrderChart();
      this.updateDailyChart();
      this.updatePopularFoodChart();
      this.isLoadingOrders.set(false);
    },
    error: error => {
      console.error('Failed to load admin orders:', error);

      this.orderErrorMessage.set(
        error.error?.message || 'Unable to load orders. Please check your login and backend.'
      );

      this.isLoadingOrders.set(false);
    }
  });
}

  // Refresh chart data from the latest orders
  updateOrderChart(): void {
    const allOrders = this.orders();

    this.orderChartData = {
      labels: ['Pending', 'Preparing', 'Ready', 'Completed', 'Cancelled'],
      datasets: [
        {
          label: 'Orders',
          data: [
            allOrders.filter(order => order.status === 'Pending').length,
            allOrders.filter(order => order.status === 'Preparing').length,
            allOrders.filter(order => order.status === 'Ready').length,
            allOrders.filter(order => order.status === 'Completed').length,
            allOrders.filter(order => order.status === 'Cancelled').length
          ]
        }
      ]
    };
  }

  // Update daily chart using actual order creation dates.
  // Uses the browser's local calendar date consistently.
  updateDailyChart(): void {
    const today = new Date();
    const labels: string[] = [];
    const counts: number[] = [];

    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(today.getDate() - i);

      const dateKey = [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, '0'),
        String(date.getDate()).padStart(2, '0')
      ].join('-');

      labels.push(
        date.toLocaleDateString('en-IN', {
          day: '2-digit',
          month: 'short'
        })
      );

      const count = this.orders().filter(order => {
        const orderDate = new Date(order.createdAt);

        const orderDateKey = [
          orderDate.getFullYear(),
          String(orderDate.getMonth() + 1).padStart(2, '0'),
          String(orderDate.getDate()).padStart(2, '0')
        ].join('-');

        return orderDateKey === dateKey;
      }).length;

      counts.push(count);
    }

    this.dailyChartData = {
      ...this.dailyChartData,
      labels,
      datasets: [
        {
          ...this.dailyChartData.datasets[0],
          data: counts
        }
      ]
    };
  }

  // Calculate popularity using the total quantities in actual order items.
  // Each order's item quantity contributes to that food item's total.
  updatePopularFoodChart(): void {
    const quantitiesByFood = new Map<string, number>();

    for (const order of this.orders()) {
      for (const item of order.items) {
        const foodName = item.name?.trim();

        if (!foodName) {
          continue;
        }

        quantitiesByFood.set(
          foodName,
          (quantitiesByFood.get(foodName) ?? 0) + item.quantity
        );
      }
    }

    const topFive = Array.from(quantitiesByFood.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .slice(0, 5);

    this.popularFoodChartData = {
      ...this.popularFoodChartData,
      labels: topFive.map(([name]) => name),
      datasets: [
        {
          ...this.popularFoodChartData.datasets[0],
          data: topFive.map(([, quantity]) => quantity)
        }
      ]
    };
  }

  // Filter orders by status
  getFilteredOrders(): Order[] {
    const selectedStatus = this.selectedOrderStatus();

    if (selectedStatus === 'All') {
      return this.orders();
    }

    return this.orders().filter(
      order => order.status === selectedStatus
    );
  }

  // Count orders by status
  getOrderCount(status: string): number {
    if (status === 'All') {
      return this.orders().length;
    }

    return this.orders().filter(
      order => order.status === status
    ).length;
  }
  // Calculate revenue from orders that have not been cancelled
getTotalRevenue(): number {
  return this.orders()
    .filter(order => order.status !== 'Cancelled')
    .reduce((total, order) => total + order.totalAmount, 0);
}

// Count orders placed today
getTodayOrderCount(): number {
  const now = new Date();

  return this.orders().filter(order => {
    const orderDate = new Date(order.createdAt);

    return (
      orderDate.getDate() === now.getDate() &&
      orderDate.getMonth() === now.getMonth() &&
      orderDate.getFullYear() === now.getFullYear()
    );
  }).length;
}
  // Update order status
  updateOrderStatus(
    orderId: string,
    status: Order['status']
  ): void {

    if (this.updatingOrderIds().includes(orderId)) {
      return;
    }

    this.orderErrorMessage.set('');
    this.orderSuccessMessage.set('');

    this.updatingOrderIds.update(
      ids => [...ids, orderId]
    );

    this.foodService.updateOrderStatus(
      orderId,
      status
    ).subscribe({
      next: response => {
        this.orderSuccessMessage.set(
          response.message || 'Order status updated successfully!'
        );

        this.updatingOrderIds.update(
          ids => ids.filter(id => id !== orderId)
        );

        this.loadOrders();
      },
      error: error => {
        console.error('Failed to update order status:', error);

        this.orderErrorMessage.set(
          error.error?.message ||
          'Unable to update order status.'
        );

        this.updatingOrderIds.update(
          ids => ids.filter(id => id !== orderId)
        );
      }
    });
  }

  // Get permitted next statuses
  getNextStatuses(
    status: Order['status']
  ): Order['status'][] {

    const transitions: Record<
      Order['status'],
      Order['status'][]
    > = {
      Pending: ['Preparing', 'Cancelled'],
      Preparing: ['Ready', 'Cancelled'],
      Ready: ['Completed'],
      Completed: [],
      Cancelled: []
    };

    return transitions[status];
  }

  // Change order filter
  filterOrders(status: string): void {
    this.selectedOrderStatus.set(status);
  }
}