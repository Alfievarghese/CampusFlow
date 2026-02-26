const express = require('express');
const supabase = require('../lib/supabase');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { auditLog } = require('../lib/audit');

const router = express.Router();

// GET /api/halls
router.get('/', async (req, res) => {
    const { data: halls, error } = await supabase.from('Hall').select('*').eq('isActive', true).order('name', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(halls);
});

// GET /api/halls/:id
router.get('/:id', async (req, res) => {
    const { data: hall } = await supabase.from('Hall').select('*').eq('id', req.params.id).single();
    if (!hall) return res.status(404).json({ error: 'Hall not found.' });
    res.json(hall);
});

// POST /api/halls
router.post('/', authenticate, requireAdmin, async (req, res) => {
    const { name, capacity, location, description } = req.body;
    if (!name || !capacity || !location) return res.status(400).json({ error: 'name, capacity, and location are required.' });
    const { data: hall, error } = await supabase.from('Hall').insert({
        id: uuidv4(), name, capacity: parseInt(capacity), location, description: description || null, isActive: true, createdAt: new Date().toISOString(),
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await auditLog(req.user.id, 'HALL_CREATED', hall.id, { name, capacity, location });
    res.status(201).json(hall);
});

// PATCH /api/halls/:id
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
    const { name, capacity, location, description, isActive } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (capacity) updateData.capacity = parseInt(capacity);
    if (location) updateData.location = location;
    if (description !== undefined) updateData.description = description;
    if (isActive !== undefined) updateData.isActive = isActive;
    const { data: hall, error } = await supabase.from('Hall').update(updateData).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await auditLog(req.user.id, 'HALL_UPDATED', hall.id);
    res.json(hall);
});

// DELETE /api/halls/:id (soft delete)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    await supabase.from('Hall').update({ isActive: false }).eq('id', req.params.id);
    await auditLog(req.user.id, 'HALL_DEACTIVATED', req.params.id);
    res.json({ message: 'Hall deactivated.' });
});

module.exports = router;
