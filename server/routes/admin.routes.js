const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth.middleware');
const { auditLog } = require('../lib/audit');

const router = express.Router();

// GET /api/admin/users - List all admins (Super Admin only)
router.get('/users', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const users = await prisma.user.findMany({
        select: { id: true, name: true, email: true, role: true, isApproved: true, isActive: true, createdAt: true },
        orderBy: { createdAt: 'desc' },
    });
    res.json(users);
});

// PATCH /api/admin/users/:id/approve - Approve admin
router.patch('/users/:id/approve', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { isApproved: true },
    });
    await auditLog(req.user.id, 'ADMIN_APPROVED', req.params.id);
    res.json({ message: 'Admin approved.', user });
});

// PATCH /api/admin/users/:id/reject - Reject / deactivate admin
router.patch('/users/:id/reject', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const user = await prisma.user.update({
        where: { id: req.params.id },
        data: { isApproved: false, isActive: false },
    });
    await auditLog(req.user.id, 'ADMIN_REJECTED', req.params.id);
    res.json({ message: 'Admin rejected.', user });
});

// GET /api/admin/settings - Get system settings
router.get('/settings', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    let settings = await prisma.systemSettings.findUnique({ where: { id: 'singleton' } });
    if (!settings) {
        settings = await prisma.systemSettings.create({ data: { id: 'singleton' } });
    }
    res.json(settings);
});

// PATCH /api/admin/settings - Update system settings
router.patch('/settings', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const { registrationEnabled, maxAdmins } = req.body;
    const settings = await prisma.systemSettings.upsert({
        where: { id: 'singleton' },
        update: {
            registrationEnabled: registrationEnabled !== undefined ? registrationEnabled : undefined,
            maxAdmins: maxAdmins !== undefined ? parseInt(maxAdmins) : undefined,
        },
        create: { id: 'singleton', registrationEnabled: registrationEnabled ?? true, maxAdmins: maxAdmins ?? 20 },
    });
    await auditLog(req.user.id, 'SETTINGS_UPDATED', 'singleton', { registrationEnabled, maxAdmins });
    res.json(settings);
});

// PATCH /api/admin/events/:id/force-cancel - Super Admin force cancel
router.patch('/events/:id/force-cancel', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const { reason } = req.body;
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    await prisma.event.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
    await auditLog(req.user.id, 'EVENT_FORCE_CANCELLED', req.params.id, { reason });
    res.json({ message: 'Event force cancelled.' });
});

module.exports = router;
