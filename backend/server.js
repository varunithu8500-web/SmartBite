require('dotenv').config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');

const connectDB = require('./config/database');
const Food = require('./models/food');
const Order = require('./models/order');
const authRoutes = require('./routes/auth');

const {
  authenticateToken,
  requireAdmin
} = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = [
    'http://localhost:4200',
    'https://smart-bite-ashy.vercel.app'
];

app.use(cors({
    origin: allowedOrigins
}));

app.use(express.json());
app.use('/api/auth', authRoutes);


// Home route
app.get('/', (req, res) => {
    res.send('Welcome to SmartBite Backend!');
});

// Get all available food items from MongoDB
// Get food items for the customer menu
app.get('/api/foods', async (req, res) => {
    try {
        const foods = await Food.find().sort({ name: 1 });

        return res.status(200).json(foods);

    } catch (error) {
        console.error('Failed to retrieve food items:', error);

        return res.status(500).json({
            message: 'Failed to retrieve food items.'
        });
    }
});
// Allow customers to cancel only their own Pending orders
app.patch(
  '/api/orders/:id/cancel',
  authenticateToken,
  async (req, res) => {
    try {
      const { id } = req.params;

      // Validate the order ID
      if (!mongoose.isValidObjectId(id)) {
        return res.status(400).json({
          message: 'Invalid order ID.'
        });
      }

      // Find an order belonging to this customer
      const order = await Order.findOne({
        _id: id,
        userId: req.user.id
      });

      // Do not reveal another customer's order
      if (!order) {
        return res.status(404).json({
          message: 'Order not found.'
        });
      }

      // Customers can cancel only Pending orders
      if (order.status !== 'Pending') {
        return res.status(409).json({
          message:
            `This order cannot be cancelled because its status is ${order.status}. Only Pending orders can be cancelled.`
        });
      }

      // Update only if the order is still Pending
      const cancelledOrder = await Order.findOneAndUpdate(
        {
          _id: id,
          userId: req.user.id,
          status: 'Pending'
        },
        {
          $set: {
            status: 'Cancelled'
          }
        },
        {
          new: true,
          runValidators: true
        }
      );

      // Handle a simultaneous status change
      if (!cancelledOrder) {
        return res.status(409).json({
          message:
            'The order status changed before cancellation. Refresh your order history and try again.'
        });
      }

      return res.status(200).json({
        message: 'Order cancelled successfully.',
        order: cancelledOrder
      });

    } catch (error) {
      console.error(
        'Failed to cancel customer order:',
        error
      );

      return res.status(500).json({
        message: 'Unable to cancel this order.'
      });
    }
  }
);
// Get all food items for the admin panel
app.get(
  '/api/admin/foods',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
        const foods = await Food.find().sort({ name: 1 });

        return res.status(200).json(foods);
    } catch (error) {
        console.error('Failed to fetch admin food list:', error);

        return res.status(500).json({
            message: 'Failed to fetch food items.'
        });
    }
});
// Add a new food item
app.post(
  '/api/foods',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
        const { name, price, category } = req.body;

        // Validate the food name
        if (
            typeof name !== 'string' ||
            name.trim().length === 0
        ) {
            return res.status(400).json({
                message: 'Food name is required.'
            });
        }

        // Validate the price
        if (
            typeof price !== 'number' ||
            !Number.isFinite(price) ||
            price < 0
        ) {
            return res.status(400).json({
                message: 'Price must be a valid non-negative number.'
            });
        }

        // Validate the category
        if (
            typeof category !== 'string' ||
            category.trim().length === 0
        ) {
            return res.status(400).json({
                message: 'Food category is required.'
            });
        }

        // Create and save the food item
        const food = await Food.create({
            name: name.trim(),
            price,
            category: category.trim(),
            available: true
        });

        return res.status(201).json({
            message: 'Food item added successfully!',
            food
        });

    } catch (error) {
        console.error('Failed to add food item:', error);

        return res.status(500).json({
            message: 'Failed to add food item.'
        });
    }
});
// Place a new order
// Get order history for the currently logged-in customer
app.get(
  '/api/orders/mine',
  authenticateToken,
  async (req, res) => {
    try {
      const orders = await Order.find({
        userId: req.user.id
      }).sort({ createdAt: -1 });

      return res.status(200).json(orders);

    } catch (error) {
      console.error(
        'Failed to retrieve customer orders:',
        error
      );

      return res.status(500).json({
        message: 'Failed to retrieve your order history.'
      });
    }
  }
);
// Place a new order for the authenticated customer
app.post(
  '/api/orders',
  authenticateToken,
  async (req, res) => {
    try {
      const { items } = req.body;

      // Validate the request
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          message: 'Your cart is empty.'
        });
      }

      const orderItems = [];
      let totalAmount = 0;

      // Validate each item and calculate prices on the server
      for (const item of items) {
        const { foodId, quantity } = item;

        if (
          typeof foodId !== 'string' ||
          !Number.isSafeInteger(quantity) ||
          quantity < 1 ||
          quantity > 100
        ) {
          return res.status(400).json({
            message: 'Invalid food item or quantity.'
          });
        }

        if (!mongoose.isValidObjectId(foodId)) {
          return res.status(400).json({
            message: 'Invalid food ID.'
          });
        }

        const food = await Food.findOne({
          _id: foodId,
          available: true
        });

        if (!food) {
          return res.status(400).json({
            message: 'A selected food item is unavailable.'
          });
        }

        const subtotal = food.price * quantity;

        orderItems.push({
          foodId: food._id,
          name: food.name,
          price: food.price,
          quantity
        });

        totalAmount += subtotal;
      }

      // Save the order with the authenticated customer's ID
      const order = await Order.create({
        userId: req.user.id,
        items: orderItems,
        totalAmount
      });

      return res.status(201).json({
        message: 'Order placed successfully!',
        order
      });

    } catch (error) {
      console.error('Failed to place order:', error);

      return res.status(500).json({
        message: 'Unable to place your order.'
      });
    }
  }
);
// Update an existing food item
app.put(
  '/api/foods/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
        const { id } = req.params;
        const { name, price, category } = req.body;

        // Validate the food ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid food ID.'
            });
        }

        // Validate the food name
        if (
            typeof name !== 'string' ||
            name.trim().length === 0
        ) {
            return res.status(400).json({
                message: 'Food name is required.'
            });
        }

        // Validate the price
        if (
            typeof price !== 'number' ||
            !Number.isFinite(price) ||
            price < 0
        ) {
            return res.status(400).json({
                message: 'Price must be a valid non-negative number.'
            });
        }

        // Validate the category
        if (
            typeof category !== 'string' ||
            category.trim().length === 0
        ) {
            return res.status(400).json({
                message: 'Food category is required.'
            });
        }

        // Update the food item
        const food = await Food.findByIdAndUpdate(
            id,
            {
                name: name.trim(),
                price,
                category: category.trim()
            },
            {
                new: true,
                runValidators: true
            }
        );

        // Handle a food item that does not exist
        if (!food) {
            return res.status(404).json({
                message: 'Food item not found.'
            });
        }

        return res.status(200).json({
            message: 'Food item updated successfully!',
            food
        });

    } catch (error) {
        console.error('Failed to update food item:', error);

        return res.status(500).json({
            message: 'Failed to update food item.'
        });
    }
});
// Update food availability
app.patch(
  '/api/foods/:id/availability',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
        const { id } = req.params;
        const { available } = req.body;

        // Validate the food ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid food ID.'
            });
        }

        // Validate availability
        if (typeof available !== 'boolean') {
            return res.status(400).json({
                message: 'Availability must be true or false.'
            });
        }

        // Update the food availability
        const food = await Food.findByIdAndUpdate(
            id,
            { available },
            { new: true, runValidators: true }
        );

        if (!food) {
            return res.status(404).json({
                message: 'Food item not found.'
            });
        }

        return res.status(200).json({
            message: available
                ? 'Food item is now available.'
                : 'Food item is now unavailable.',
            food
        });

    } catch (error) {
        console.error('Failed to update food availability:', error);

        return res.status(500).json({
            message: 'Failed to update food availability.'
        });
    }
});
// Delete a food item safely
app.delete(
  '/api/foods/:id',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
        const { id } = req.params;

        // 1. Validate the food ID
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid food ID.'
            });
        }

        // 2. Check whether the food item exists
        const food = await Food.findById(id);

        if (!food) {
            return res.status(404).json({
                message: 'Food item not found.'
            });
        }

        // 3. Protect existing order history
        const existingOrder = await Order.exists({
            'items.foodId': food._id
        });

        if (existingOrder) {
            return res.status(409).json({
                message:
                    'This food item belongs to an existing order and cannot be deleted. Mark it unavailable instead.'
            });
        }

        // 4. Delete the food item
        await Food.findByIdAndDelete(id);

        return res.status(200).json({
            message: 'Food item deleted successfully!'
        });

    } catch (error) {
        console.error('Failed to delete food item:', error);

        return res.status(500).json({
            message: 'Failed to delete food item.'
        });
    }
});
// Get all orders, newest first
app.get(
  '/api/orders',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
  try {
    const orders = await Order.find()
      .sort({ createdAt: -1 });

    res.status(200).json(orders);

  } catch (error) {
    console.error('Failed to retrieve orders:', error);

    res.status(500).json({
      message: 'Failed to retrieve order history.'
    });
  }
});
// Update the status of an existing order
// Update order status with transition validation
app.patch(
  '/api/orders/:id/status',
  authenticateToken,
  requireAdmin,
  async (req, res) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        // Check whether the order ID is valid
        if (!mongoose.isValidObjectId(id)) {
            return res.status(400).json({
                message: 'Invalid order ID.'
            });
        }

        // Define permitted status transitions
        const allowedTransitions = {
            Pending: ['Preparing', 'Cancelled'],
            Preparing: ['Ready', 'Cancelled'],
            Ready: ['Completed'],
            Completed: [],
            Cancelled: []
        };

        // Find the order
        const order = await Order.findById(id);

        if (!order) {
            return res.status(404).json({
                message: 'Order not found.'
            });
        }

        // Check whether the requested transition is allowed
        // Check whether the requested transition is allowed
const nextStatuses = allowedTransitions[order.status];

console.log('Order status validation:', {
    orderId: id,
    currentStatus: order.status,
    requestedStatus: status,
    allowedNextStatuses: nextStatuses
});

if (!nextStatuses || !nextStatuses.includes(status)) {
    console.log('Rejected invalid status transition.');

    return res.status(400).json({
        message: `Cannot change order status from ${order.status} to ${status}.`
    });
}
        // Update the status
        order.status = status;
        await order.save();

        return res.status(200).json({
            message: 'Order status updated successfully!',
            order
        });

    } catch (error) {
        console.error('Failed to update order status:', error);

        return res.status(500).json({
            message: 'Failed to update order status.'
        });
    }
});
console.log('Food routes registered: GET /api/foods, POST /api/foods');
// Start the server after connecting to MongoDB
async function startServer() {
    try {
        await connectDB();

        app.listen(PORT, () => {
            console.log(`SmartBite server running on port ${PORT}`);
        });
    } catch (error) {
        console.error('Unable to start the application:', error.message);
        process.exit(1);
    }
}

startServer();