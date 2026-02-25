const express = require('express');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../lib/supabase');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth.middleware');
const { auditLog } = require('../lib/audit');

const router = express.Router();

// GET /api/admin/users
router.get('/users', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const { data: users, error } = await supabase
        .from('User')
        .select('id, name, email, role, isApproved, isActive, createdAt')
        .order('createdAt', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(users);
});

// POST /api/admin/users - Manually create admin
router.post('/users', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ error: 'Name, email, and password are required.' });
    if (password.length < 8) return res.status(400).json({ error: 'Password must be at least 8 characters.' });
    const assignedRole = ['ADMIN', 'SUPER_ADMIN'].includes(role) ? role : 'ADMIN';

    const { data: existing } = await supabase.from('User').select('id').eq('email', email).single();
    if (existing) return res.status(409).json({ error: 'An account with this email already exists.' });

    const passwordHash = await bcrypt.hash(password, 12);
    const { data: user, error } = await supabase.from('User').insert({
        id: uuidv4(), name, email, passwordHash, role: assignedRole, isApproved: true, isActive: true,
        createdAt: new Date().toISOString(),
    }).select('id, name, email, role, isApproved, isActive, createdAt').single();

    if (error) return res.status(500).json({ error: error.message });
    await auditLog(req.user.id, 'ADMIN_CREATED_MANUALLY', user.id, { name, email, role: assignedRole });
    res.status(201).json(user);
});

// PATCH /api/admin/users/:id/approve
router.patch('/users/:id/approve', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const { data: user, error } = await supabase.from('User').update({ isApproved: true }).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await auditLog(req.user.id, 'ADMIN_APPROVED', req.params.id);
    res.json({ message: 'Admin approved.', user });
});

// PATCH /api/admin/users/:id/reject
router.patch('/users/:id/reject', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const { data: user, error } = await supabase.from('User').update({ isApproved: false, isActive: false }).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await auditLog(req.user.id, 'ADMIN_REJECTED', req.params.id);
    res.json({ message: 'Admin rejected.', user });
});

// GET /api/admin/settings
router.get('/settings', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    let { data: settings } = await supabase.from('SystemSettings').select('*').eq('id', 'singleton').single();
    if (!settings) {
        const r = await supabase.from('SystemSettings').insert({ id: 'singleton', registrationEnabled: true, maxAdmins: 20, updatedAt: new Date().toISOString() }).select().single();
        settings = r.data;
    }
    res.json(settings);
});

// PATCH /api/admin/settings
router.patch('/settings', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const { registrationEnabled, maxAdmins } = req.body;
    const updateData = { updatedAt: new Date().toISOString() };
    if (registrationEnabled !== undefined) updateData.registrationEnabled = registrationEnabled;
    if (maxAdmins !== undefined) updateData.maxAdmins = parseInt(maxAdmins);

    let { data: settings } = await supabase.from('SystemSettings').select('id').eq('id', 'singleton').single();
    if (settings) {
        const r = await supabase.from('SystemSettings').update(updateData).eq('id', 'singleton').select().single();
        settings = r.data;
    } else {
        const r = await supabase.from('SystemSettings').insert({ id: 'singleton', registrationEnabled: registrationEnabled ?? true, maxAdmins: maxAdmins ?? 20, updatedAt: new Date().toISOString() }).select().single();
        settings = r.data;
    }
    await auditLog(req.user.id, 'SETTINGS_UPDATED', 'singleton', { registrationEnabled, maxAdmins });
    res.json(settings);
});

// PATCH /api/admin/events/:id/force-cancel
router.patch('/events/:id/force-cancel', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const { reason } = req.body;
    const { data: event } = await supabase.from('Event').select('id').eq('id', req.params.id).single();
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    await supabase.from('Event').update({ status: 'CANCELLED' }).eq('id', req.params.id);
    await auditLog(req.user.id, 'EVENT_FORCE_CANCELLED', req.params.id, { reason });
    res.json({ message: 'Event force cancelled.' });
});

module.exports = router;
