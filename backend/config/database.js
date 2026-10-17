const mongoose = require('mongoose');
require('dotenv').config();

async function connectDB() {
    const mongoURI = process.env.MONGODB_URI;

    if (!mongoURI) {
        throw new Error(
            'MONGODB_URI is missing from the environment variables'
        );
    }

    try {
        await mongoose.connect(mongoURI);

        console.log('MongoDB connected successfully!');
        console.log('Database:', mongoose.connection.name);
        console.log('Cluster host:', mongoose.connection.host);
    } catch (error) {
        console.error('MongoDB connection failed:', error.message);
        throw error;
    }
}

module.exports = connectDB;
