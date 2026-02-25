const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../lib/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { checkConflicts, checkRecurringConflicts } = require('../lib/conflictEngine');
const { auditLog } = require('../lib/audit');

const router = express.Router();

// Multer setup for poster uploads
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
    filename: (req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `poster_${uuidv4()}${ext}`);
    },
});
const upload = multer({
    storage,
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (/image\/(jpeg|png|webp|gif)/.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    },
});

const EVENT_SELECT = 'id, title, description, startTime, endTime, status, category, inviteType, expectedAttendance, posterUrl, recurrenceRule, createdAt, updatedAt, createdBy, hallId, hall:Hall(id, name, capacity, location), creator:User(id, name, email)';

// GET /api/events - Public list
router.get('/', async (req, res) => {
    const { category, from, to, search, inviteType } = req.query;
    let query = supabase.from('Event').select(EVENT_SELECT).neq('status', 'CANCELLED').order('startTime', { ascending: true });
    if (category) query = query.eq('category', category);
    if (inviteType) query = query.eq('inviteType', inviteType);
    if (from) query = query.gte('startTime', new Date(from).toISOString());
    if (to) query = query.lte('startTime', new Date(to).toISOString());
    if (search) query = query.ilike('title', `%${search}%`);
    const { data: events, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(events);
});

// GET /api/events/my - Admin's own events
router.get('/my', authenticate, requireAdmin, async (req, res) => {
    const { data: events, error } = await supabase.from('Event')
        .select(EVENT_SELECT).eq('createdBy', req.user.id).order('startTime', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(events);
});

// GET /api/events/:id
router.get('/:id', async (req, res) => {
    const { data: event } = await supabase.from('Event').select(EVENT_SELECT).eq('id', req.params.id).single();
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    res.json(event);
});

// POST /api/events - Create event
router.post('/', authenticate, requireAdmin, upload.single('poster'), async (req, res) => {
    const { title, description, startTime, endTime, hallId, category, inviteType, expectedAttendance, recurrenceRule } = req.body;
    if (!title || !startTime || !endTime || !hallId || !category) {
        return res.status(400).json({ error: 'title, startTime, endTime, hallId, category are required.' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) return res.status(400).json({ error: 'End time must be after start time.' });
    if (start < new Date()) return res.status(400).json({ error: 'Cannot book a time in the past.' });

    const { data: hall } = await supabase.from('Hall').select('capacity, isActive').eq('id', hallId).single();
    if (!hall || !hall.isActive) return res.status(404).json({ error: 'Hall not found.' });

    const attendance = parseInt(expectedAttendance) || 0;
    const capacityWarning = attendance > hall.capacity ? `Expected attendance (${attendance}) exceeds hall capacity (${hall.capacity}).` : null;

    let parsedRecurrence = null;
    if (recurrenceRule) { try { parsedRecurrence = JSON.parse(recurrenceRule); } catch { /* ignore */ } }

    let conflictResult;
    if (parsedRecurrence) {
        conflictResult = await checkRecurringConflicts(hallId, start, end, parsedRecurrence);
        if (conflictResult.hasConflict) {
            return res.status(409).json({ error: 'Conflict detected in recurring schedule.', conflicts: conflictResult.conflictsByDate, capacityWarning });
        }
    } else {
        conflictResult = await checkConflicts(hallId, start, end);
        if (conflictResult.hasConflict) {
            return res.status(409).json({ error: 'Hall is already booked for this time slot.', conflicts: conflictResult.conflictingEvents, capacityWarning, canRequestOverride: true });
        }
    }

    const posterUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const { data: event, error } = await supabase.from('Event').insert({
        id: uuidv4(),
        title,
        description: description || '',
        startTime: start.toISOString(),
        endTime: end.toISOString(),
        hallId,
        category,
        inviteType: inviteType || 'PUBLIC',
        expectedAttendance: attendance,
        recurrenceRule: recurrenceRule || null,
        posterUrl,
        status: 'CONFIRMED',
        createdBy: req.user.id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    }).select(EVENT_SELECT).single();

    if (error) return res.status(500).json({ error: error.message });
    await auditLog(req.user.id, 'EVENT_CREATED', event.id, { title, hallId, startTime, endTime });
    res.status(201).json({ event, capacityWarning });
});

// PATCH /api/events/:id - Update event
router.patch('/:id', authenticate, requireAdmin, upload.single('poster'), async (req, res) => {
    const { data: existing } = await supabase.from('Event').select('*').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ error: 'Event not found.' });
    if (existing.createdBy !== req.user.id && req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Not authorized to edit this event.' });
    if (existing.status === 'CANCELLED') return res.status(400).json({ error: 'Cannot edit a cancelled event.' });

    const { title, description, startTime, endTime, hallId, category, inviteType, expectedAttendance } = req.body;
    const newStart = startTime ? new Date(startTime) : new Date(existing.startTime);
    const newEnd = endTime ? new Date(endTime) : new Date(existing.endTime);
    const newHallId = hallId || existing.hallId;

    if (newStart >= newEnd) return res.status(400).json({ error: 'End time must be after start time.' });

    if (startTime || endTime || hallId) {
        const conflict = await checkConflicts(newHallId, newStart, newEnd, existing.id);
        if (conflict.hasConflict) {
            return res.status(409).json({ error: 'Hall conflict detected.', conflicts: conflict.conflictingEvents, canRequestOverride: true });
        }
    }

    const posterUrl = req.file ? `/uploads/${req.file.filename}` : existing.posterUrl;

    const { data: updated, error } = await supabase.from('Event').update({
        title: title || existing.title,
        description: description !== undefined ? description : existing.description,
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        hallId: newHallId,
        category: category || existing.category,
        inviteType: inviteType || existing.inviteType,
        expectedAttendance: expectedAttendance !== undefined ? parseInt(expectedAttendance) : existing.expectedAttendance,
        posterUrl,
        updatedAt: new Date().toISOString(),
    }).eq('id', req.params.id).select(EVENT_SELECT).single();

    if (error) return res.status(500).json({ error: error.message });
    await auditLog(req.user.id, 'EVENT_UPDATED', req.params.id, { title, startTime, endTime });
    res.json(updated);
});

// DELETE /api/events/:id - Cancel event
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    const { reason } = req.body;
    const { data: event } = await supabase.from('Event').select('createdBy').eq('id', req.params.id).single();
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (event.createdBy !== req.user.id && req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Not authorized to cancel this event.' });
    await supabase.from('Event').update({ status: 'CANCELLED' }).eq('id', req.params.id);
    await auditLog(req.user.id, 'EVENT_CANCELLED', req.params.id, { reason });
    res.json({ message: 'Event cancelled.' });
});

// GET /api/events/:hallId/availability
router.get('/:hallId/availability', async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date query param required.' });
    const dayStart = new Date(date); dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date); dayEnd.setHours(23, 59, 59, 999);

    const { data: events, error } = await supabase.from('Event')
        .select('id, title, startTime, endTime, status, creator:User(name)')
        .eq('hallId', req.params.hallId)
        .neq('status', 'CANCELLED')
        .gte('startTime', dayStart.toISOString())
        .lte('endTime', dayEnd.toISOString())
        .order('startTime', { ascending: true });

    if (error) return res.status(500).json({ error: error.message });
    res.json(events);
});

module.exports = router;
