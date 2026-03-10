const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../lib/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { checkConflicts, checkRecurringConflicts } = require('../lib/conflictEngine');
const { auditLog } = require('../lib/audit');

const router = express.Router();

// Multer — memory storage (files stay as buffers, then we push to Supabase Storage)
const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024 },
    fileFilter: (req, file, cb) => {
        if (/image\/(jpeg|png|webp|gif)/.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    },
});
const eventUpload = upload.fields([{ name: 'poster', maxCount: 1 }, { name: 'banner', maxCount: 1 }]);

// Upload a multer file buffer to Supabase Storage, returns public URL or null
async function uploadToSupabase(file, prefix) {
    if (!file) return null;
    const ext = path.extname(file.originalname) || '.jpg';
    const filename = `${prefix}_${uuidv4()}${ext}`;
    const { error } = await supabase.storage
        .from('event-images')
        .upload(filename, file.buffer, { contentType: file.mimetype, upsert: false });
    if (error) { console.error('Supabase Storage upload error:', error.message); return null; }
    const { data } = supabase.storage.from('event-images').getPublicUrl(filename);
    return data.publicUrl;
}

const EVENT_SELECT = 'id, title, description, startTime, endTime, status, category, inviteType, expectedAttendance, posterUrl, bannerUrl, recurrenceRule, createdAt, updatedAt, createdBy, hallId, hall:Hall(id, name, capacity, location), creator:User(id, name, email)';

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

// GET /api/events/banners - Upcoming events with banner images for homepage carousel
router.get('/banners', async (req, res) => {
    const { data: events, error } = await supabase.from('Event')
        .select('id, title, startTime, endTime, bannerUrl, category, hall:Hall(name)')
        .eq('status', 'CONFIRMED')
        .not('bannerUrl', 'is', null)
        .gte('startTime', new Date().toISOString())
        .order('startTime', { ascending: true })
        .limit(8);
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
router.post('/', authenticate, requireAdmin, async (req, res) => {
    const { title, description, startTime, endTime, hallId, category, inviteType, expectedAttendance, recurrenceRule, posterUrl, bannerUrl } = req.body;
    if (!title || !startTime || !endTime || !hallId || !category) {
        return res.status(400).json({ error: 'title, startTime, endTime, hallId, category are required.' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) return res.status(400).json({ error: 'End time must be after start time.' });
    if (start < new Date()) return res.status(400).json({ error: 'Cannot book a time in the past.' });

    const { data: hall } = await supabase.from('Hall').select('capacity, isActive').eq('id', hallId).single();
    if (!hall || !hall.isActive) return res.status(404).json({ error: 'Venue not found.' });

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
            return res.status(409).json({ error: 'Venue is already booked for this time slot.', conflicts: conflictResult.conflictingEvents, capacityWarning, canRequestOverride: true });
        }
    }

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
        bannerUrl,
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
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
    const { data: existing } = await supabase.from('Event').select('*').eq('id', req.params.id).single();
    if (!existing) return res.status(404).json({ error: 'Event not found.' });
    if (existing.createdBy !== req.user.id && req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Not authorized to edit this event.' });
    if (existing.status === 'CANCELLED') return res.status(400).json({ error: 'Cannot edit a cancelled event.' });

    const { title, description, startTime, endTime, hallId, category, inviteType, expectedAttendance, posterUrl, bannerUrl } = req.body;
    const newStart = startTime ? new Date(startTime) : new Date(existing.startTime);
    const newEnd = endTime ? new Date(endTime) : new Date(existing.endTime);
    const newHallId = hallId || existing.hallId;

    if (newStart >= newEnd) return res.status(400).json({ error: 'End time must be after start time.' });

    if (startTime || endTime || hallId) {
        const conflict = await checkConflicts(newHallId, newStart, newEnd, existing.id);
        if (conflict.hasConflict) {
            return res.status(409).json({ error: 'Venue conflict detected.', conflicts: conflict.conflictingEvents, canRequestOverride: true });
        }
    }

    const finalPosterUrl = posterUrl !== undefined ? posterUrl : existing.posterUrl;
    const finalBannerUrl = bannerUrl !== undefined ? bannerUrl : existing.bannerUrl;

    const { data: updated, error } = await supabase.from('Event').update({
        title: title || existing.title,
        description: description !== undefined ? description : existing.description,
        startTime: newStart.toISOString(),
        endTime: newEnd.toISOString(),
        hallId: newHallId,
        category: category || existing.category,
        inviteType: inviteType || existing.inviteType,
        expectedAttendance: expectedAttendance !== undefined ? parseInt(expectedAttendance) : existing.expectedAttendance,
        posterUrl: finalPosterUrl,
        bannerUrl: finalBannerUrl,
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
