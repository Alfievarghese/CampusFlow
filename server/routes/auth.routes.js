const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');
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
    const settings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
    if (settings && !settings.registrationEnabled) {
        return res.status(403).json({ error: 'Admin registration is currently disabled.' });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        return res.status(409).json({ error: 'Email already in use.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);

    // First ever user becomes Super Admin (auto-approved)
    const userCount = await prisma.user.count();
    const isSuperAdmin = userCount === 0;

    const user = await prisma.user.create({
        data: {
            name,
            email,
            passwordHash,
            role: isSuperAdmin ? 'SUPER_ADMIN' : 'ADMIN',
            isApproved: isSuperAdmin, // Super admin is auto-approved
        },
    });

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

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.isActive) {
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

module.exports = router;
