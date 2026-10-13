const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/user');

const router = express.Router();

// Register a new customer
router.post('/register', async (req, res) => {
    try {
        const { name, email, password } = req.body;

        // Validate required fields
        if (
            typeof name !== 'string' ||
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !name.trim() ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: 'Name, email, and password are required.'
            });
        }

        // Validate name
        if (name.trim().length < 2 || name.trim().length > 100) {
            return res.status(400).json({
                message: 'Name must contain between 2 and 100 characters.'
            });
        }

        // Validate password
        if (password.length < 8 || password.length > 72) {
            return res.status(400).json({
                message: 'Password must contain between 8 and 72 characters.'
            });
        }

        // Normalize and validate email
        const normalizedEmail = email.trim().toLowerCase();

        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
            return res.status(400).json({
                message: 'Please enter a valid email address.'
            });
        }

        // Check for an existing account
        const existingUser = await User.findOne({
            email: normalizedEmail
        });

        if (existingUser) {
            return res.status(409).json({
                message: 'An account with this email already exists.'
            });
        }

        // Hash the password before saving
        const hashedPassword = await bcrypt.hash(password, 12);

        // Public registration always creates a customer account
        const user = await User.create({
            name: name.trim(),
            email: normalizedEmail,
            password: hashedPassword,
            role: 'customer'
        });

        return res.status(201).json({
            message: 'Registration successful.',
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        if (error.code === 11000) {
            return res.status(409).json({
                message: 'An account with this email already exists.'
            });
        }

        console.error('Registration error:', error);

        return res.status(500).json({
            message: 'Registration failed. Please try again.'
        });
    }
});

// Log in an existing user
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;

        // Validate required fields
        if (
            typeof email !== 'string' ||
            typeof password !== 'string' ||
            !email.trim() ||
            !password
        ) {
            return res.status(400).json({
                message: 'Email and password are required.'
            });
        }

        // Retrieve the password hash for verification
        const user = await User.findOne({
            email: email.trim().toLowerCase()
        }).select('+password');

        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({
                message: 'Invalid email or password.'
            });
        }

        // Ensure JWT_SECRET is configured
        if (!process.env.JWT_SECRET) {
            throw new Error('JWT_SECRET is not configured.');
        }

        // Generate the authentication token
        const token = jwt.sign(
            {
                sub: user._id.toString(),
                role: user.role
            },
            process.env.JWT_SECRET,
            {
                expiresIn: process.env.JWT_EXPIRES_IN || '1h',
                issuer: 'smartbite-api',
                audience: 'smartbite-client'
            }
        );

        return res.status(200).json({
            message: 'Login successful.',
            token,
            user: {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                role: user.role
            }
        });
    } catch (error) {
        console.error('Login error:', error);

        return res.status(500).json({
            message: 'Login failed. Please try again.'
        });
    }
});

// Export the router
module.exports = router;