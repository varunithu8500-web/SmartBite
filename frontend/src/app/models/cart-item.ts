import type { Food } from '../services/food';

export interface CartItem {
  food: Food;
  quantity: number;
}