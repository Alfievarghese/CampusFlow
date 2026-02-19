const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth.middleware');
const { auditLog } = require('../lib/audit');

const router = express.Router();

// GET /api/halls - Get all halls (public)
router.get('/', async (req, res) => {
    const halls = await prisma.hall.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
    });
    res.json(halls);
});

// GET /api/halls/:id
router.get('/:id', async (req, res) => {
    const hall = await prisma.hall.findUnique({ where: { id: req.params.id } });
    if (!hall) return res.status(404).json({ error: 'Hall not found.' });
    res.json(hall);
});

// POST /api/halls - Create (Super Admin only)
router.post('/', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const { name, capacity, location, description } = req.body;
    if (!name || !capacity || !location) {
        return res.status(400).json({ error: 'name, capacity, and location are required.' });
    }
    const hall = await prisma.hall.create({
        data: { name, capacity: parseInt(capacity), location, description },
    });
    await auditLog(req.user.id, 'HALL_CREATED', hall.id, { name, capacity, location });
    res.status(201).json(hall);
});

// PATCH /api/halls/:id - Update (Super Admin only)
router.patch('/:id', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const { name, capacity, location, description, isActive } = req.body;
    const hall = await prisma.hall.update({
        where: { id: req.params.id },
        data: {
            name: name || undefined,
            capacity: capacity ? parseInt(capacity) : undefined,
            location: location || undefined,
            description: description !== undefined ? description : undefined,
            isActive: isActive !== undefined ? isActive : undefined,
        },
    });
    await auditLog(req.user.id, 'HALL_UPDATED', hall.id);
    res.json(hall);
});

// DELETE /api/halls/:id - Soft delete (Super Admin only)
router.delete('/:id', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    await prisma.hall.update({ where: { id: req.params.id }, data: { isActive: false } });
    await auditLog(req.user.id, 'HALL_DEACTIVATED', req.params.id);
    res.json({ message: 'Hall deactivated.' });
});

module.exports = router;
