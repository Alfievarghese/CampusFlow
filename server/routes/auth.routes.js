const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const supabase = require('../lib/supabase');
const { auditLog } = require('../lib/audit');
const { authenticate } = require('../middleware/auth.middleware');

const router = express.Router();

// Register (Admin registration - requires Super Admin approval)
router.post('/register', async (req, res) => {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Name, email, and password are required.' });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    }

    // Check if registration is enabled
    const { data: settings } = await supabase.from('SystemSettings').select('*').eq('id', 'singleton').single();
    if (settings && !settings.registrationEnabled) {
        return res.status(403).json({ error: 'Admin registration is currently disabled.' });
    }

    const { data: existing } = await supabase.from('User').select('id').eq('email', email).single();
    if (existing) {
        return res.status(409).json({ error: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // First ever user becomes Super Admin (auto-approved)
    const { count } = await supabase.from('User').select('id', { count: 'exact', head: true });
    const isSuperAdmin = (count ?? 0) === 0;

    const { data: user, error } = await supabase.from('User').insert({
        name,
        email,
        passwordHash,
        role: isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN',
        isApproved: isSuperAdmin,
        isActive: true,
        createdAt: new Date().toISOString(),
    }).select('id, name, email, role, isApproved').single();

    if (error) {
        console.error('[REGISTER ERROR]', error);
        return res.status(500).json({ error: 'Registration failed.' });
    }

    await auditLog(user.id, 'USER_REGISTERED', user.id, { email, role: user.role });

    res.status(201).json({
        message: isSuperAdmin
            ? 'Super Admin account created. You are automatically approved.'
            : 'Registration successful. Awaiting Super Admin approval.',
        isApproved: user.isApproved,
        role: user.role,
    });
});

// Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
    }

    const { data: user, error } = await supabase.from('User').select('*').eq('email', email).single();
    if (error || !user || !user.isActive) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    const isValid = await bcrypt.compare(password, user.passwordHash);
    if (!isValid) {
        return res.status(401).json({ error: 'Invalid credentials.' });
    }

    if (!user.isApproved) {
        return res.status(403).json({ error: 'Your account is pending approval by Super Admin.' });
    }

    const token = jwt.sign(
        { userId: user.id, role: user.role },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    await auditLog(user.id, 'USER_LOGIN', user.id);

    res.json({
        token,
        user: {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            isApproved: user.isApproved,
        },
    });
});

// Get current user
router.get('/me', authenticate, async (req, res) => {
    const user = req.user;
    res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        isApproved: user.isApproved,
        createdAt: user.createdAt,
    });
});

// PUT /api/auth/profile - Update own name/password
router.put('/profile', authenticate, async (req, res) => {
    const { name, password } = req.body;
    if (!name && !password) {
        return res.status(400).json({ error: 'Provide name or password to update.' });
    }

    const updateData = {};
    if (name && name.trim()) updateData.name = name.trim();
    if (password) {
        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters.' });
        }
        updateData.passwordHash = await bcrypt.hash(password, 12);
    }

    const { data: updated, error } = await supabase
        .from('User')
        .update(updateData)
        .eq('id', req.user.id)
        .select('id, name, email, role')
        .single();

    if (error) return res.status(500).json({ error: 'Update failed.' });

    await auditLog(req.user.id, 'PROFILE_UPDATED', req.user.id, { fields: Object.keys(updateData) });

    res.json(updated);
});

module.exports = router;
