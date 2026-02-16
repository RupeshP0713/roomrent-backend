const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
    // MongoDB Connection
    const isProduction = process.env.NODE_ENV === 'production';
    const LOCAL_MONGODB_URI = 'mongodb://127.0.0.1:27017/roomrent';

    // In production (Vercel), MONGODB_URI MUST be provided via environment variables.
    // In development, we fall back to a local MongoDB instance if not set.
    const MONGODB_URI = process.env.MONGODB_URI || (isProduction ? null : LOCAL_MONGODB_URI);

    if (!MONGODB_URI) {
        console.error('❌ MONGODB_URI is not set. Please configure it in your environment variables.');
        // In serverless environments, it's better to fail fast if DB is not configured.
        throw new Error('MONGODB_URI is required in production environment');
    }

    try {
        const conn = await mongoose.connect(MONGODB_URI, {
            useNewUrlParser: true,
            useUnifiedTopology: true,
        });

        console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}`);

        // Database Status Check
        mongoose.connection.on('connected', () => {
            console.log('Mongoose connected to db');
        });

        mongoose.connection.on('disconnected', () => {
            console.log('Mongoose connection disconnected');
        });

    } catch (err) {
        console.error(`❌ MongoDB Connection Error: ${err.message}`);
        process.exit(1);
    }
};

module.exports = connectDB;
