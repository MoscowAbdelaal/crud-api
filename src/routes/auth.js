const express = require('express');
const supabase = require('../config/supabaseClient');
const { verifyToken } = require('../middleware/authMiddleware');
const router = express.Router();

// POST /auth/signup - Create a new user account
router.post('/signup', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const { data, error } = await supabase.auth.signUp({
            email,
            password
        });
        
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(201).json({
            message: 'User created successfully!',
            user: data.user
        });
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /auth/login - Authenticate and return a JWT
router.post('/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        if (!email || !password) {
            return res.status(400).json({ error: 'Email and password are required' });
        }
        
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            return res.status(401).json({ error: 'Invalid login credentials' });
        }
        
        res.status(200).json({
            message: 'Login successful!',
            access_token: data.session.access_token,
            refresh_token: data.session.refresh_token,
            user: data.user
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// POST /auth/logout - End the user's session (protected)
router.post('/logout', verifyToken, async (req, res) => {
    try {
        const { error } = await supabase.auth.signOut();
        
        if (error) {
            return res.status(400).json({ error: error.message });
        }
        
        res.status(204).send();
    } catch (error) {
        console.error('Logout error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

module.exports = router;