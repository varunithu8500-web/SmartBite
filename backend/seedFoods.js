const mongoose = require('mongoose');
const connectDB = require('./config/database');
const Food = require('./models/food');

const sampleFoods = [
    {
        name: 'Idli',
        price: 20,
        category: 'South Indian',
        available: true
    },
    {
        name: 'Dosa',
        price: 40,
        category: 'South Indian',
        available: true
    },
    {
        name: 'Poori',
        price: 35,
        category: 'South Indian',
        available: true
    },
    {
        name: 'Tea',
        price: 10,
        category: 'Beverages',
        available: true
    }
];

async function seedFoods() {
    try {
        await connectDB();

        const existingCount = await Food.countDocuments();

        if (existingCount > 0) {
            console.log('Food items already exist. No data inserted.');
            return;
        }

        const insertedFoods = await Food.insertMany(sampleFoods);

        console.log(`${insertedFoods.length} food items inserted successfully!`);
    } catch (error) {
        console.error('Error inserting food items:', error.message);
    } finally {
        await mongoose.connection.close();
    }
}

seedFoods();