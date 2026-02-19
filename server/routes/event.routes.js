const express = require('express');
const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const prisma = require('../lib/prisma');
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
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        if (/image\/(jpeg|png|webp|gif)/.test(file.mimetype)) cb(null, true);
        else cb(new Error('Only image files are allowed'));
    },
});

function buildEventSelect() {
    return {
        id: true, title: true, description: true, startTime: true, endTime: true,
        status: true, category: true, inviteType: true, expectedAttendance: true,
        posterUrl: true, recurrenceRule: true, createdAt: true, updatedAt: true,
        hall: { select: { id: true, name: true, capacity: true, location: true } },
        creator: { select: { id: true, name: true, email: true } },
        _count: { select: { rsvps: true } },
    };
}

// GET /api/events - Public list (no auth needed)
router.get('/', async (req, res) => {
    const { category, from, to, search, inviteType } = req.query;
    const where = { status: { not: 'CANCELLED' } };
    if (category) where.category = category;
    if (inviteType) where.inviteType = inviteType;
    if (from || to) {
        where.startTime = {};
        if (from) where.startTime.gte = new Date(from);
        if (to) where.startTime.lte = new Date(to);
    }
    if (search) where.title = { contains: search };

    const events = await prisma.event.findMany({
        where,
        select: buildEventSelect(),
        orderBy: { startTime: 'asc' },
    });
    res.json(events);
});

// GET /api/events/my - Personal calendar (admin only)
router.get('/my', authenticate, requireAdmin, async (req, res) => {
    const events = await prisma.event.findMany({
        where: { createdBy: req.user.id },
        select: buildEventSelect(),
        orderBy: { startTime: 'asc' },
    });
    res.json(events);
});

// GET /api/events/:id - Single event
router.get('/:id', async (req, res) => {
    const event = await prisma.event.findUnique({
        where: { id: req.params.id },
        select: {
            ...buildEventSelect(),
            inviteRequests: { select: { id: true, status: true } },
        },
    });
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    res.json(event);
});

// POST /api/events - Create event (admin only)
router.post('/', authenticate, requireAdmin, upload.single('poster'), async (req, res) => {
    const {
        title, description, startTime, endTime, hallId, category,
        inviteType, expectedAttendance, recurrenceRule,
    } = req.body;

    if (!title || !startTime || !endTime || !hallId || !category) {
        return res.status(400).json({ error: 'title, startTime, endTime, hallId, category are required.' });
    }

    const start = new Date(startTime);
    const end = new Date(endTime);
    if (start >= end) return res.status(400).json({ error: 'End time must be after start time.' });
    if (start < new Date()) return res.status(400).json({ error: 'Cannot book a time in the past.' });

    const hall = await prisma.hall.findUnique({ where: { id: hallId } });
    if (!hall || !hall.isActive) return res.status(404).json({ error: 'Hall not found.' });

    const attendance = parseInt(expectedAttendance) || 0;
    let capacityWarning = null;
    if (attendance > hall.capacity) {
        capacityWarning = `Expected attendance (${attendance}) exceeds hall capacity (${hall.capacity}).`;
    }

    // Parse recurrence rule
    let parsedRecurrence = null;
    if (recurrenceRule) {
        try { parsedRecurrence = JSON.parse(recurrenceRule); } catch { /* ignore */ }
    }

    // Check conflicts
    let conflictResult;
    if (parsedRecurrence) {
        conflictResult = await checkRecurringConflicts(hallId, start, end, parsedRecurrence);
        if (conflictResult.hasConflict) {
            return res.status(409).json({
                error: 'Conflict detected in recurring schedule.',
                conflicts: conflictResult.conflictsByDate,
                capacityWarning,
            });
        }
    } else {
        conflictResult = await checkConflicts(hallId, start, end);
        if (conflictResult.hasConflict) {
            return res.status(409).json({
                error: 'Hall is already booked for this time slot.',
                conflicts: conflictResult.conflictingEvents,
                capacityWarning,
                canRequestOverride: true,
            });
        }
    }

    const posterUrl = req.file ? `/uploads/${req.file.filename}` : null;

    const event = await prisma.event.create({
        data: {
            title,
            description: description || '',
            startTime: start,
            endTime: end,
            hallId,
            category,
            inviteType: inviteType || 'PUBLIC',
            expectedAttendance: attendance,
            recurrenceRule: recurrenceRule || null,
            posterUrl,
            status: 'CONFIRMED',
            createdBy: req.user.id,
        },
        select: buildEventSelect(),
    });

    await auditLog(req.user.id, 'EVENT_CREATED', event.id, { title, hallId, startTime, endTime });

    res.status(201).json({ event, capacityWarning });
});

// PATCH /api/events/:id - Update event
router.patch('/:id', authenticate, requireAdmin, upload.single('poster'), async (req, res) => {
    const existing = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!existing) return res.status(404).json({ error: 'Event not found.' });

    // Only creator or super admin can update
    if (existing.createdBy !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Not authorized to edit this event.' });
    }
    if (existing.status === 'CANCELLED') {
        return res.status(400).json({ error: 'Cannot edit a cancelled event.' });
    }

    const { title, description, startTime, endTime, hallId, category, inviteType, expectedAttendance } = req.body;
    const newStart = startTime ? new Date(startTime) : existing.startTime;
    const newEnd = endTime ? new Date(endTime) : existing.endTime;
    const newHallId = hallId || existing.hallId;

    if (newStart >= newEnd) return res.status(400).json({ error: 'End time must be after start time.' });

    // Re-check conflicts if time/hall changed
    const timeChanged = startTime || endTime || hallId;
    if (timeChanged) {
        const conflict = await checkConflicts(newHallId, newStart, newEnd, existing.id);
        if (conflict.hasConflict) {
            return res.status(409).json({
                error: 'Hall conflict detected.',
                conflicts: conflict.conflictingEvents,
                canRequestOverride: true,
            });
        }
    }

    const posterUrl = req.file ? `/uploads/${req.file.filename}` : existing.posterUrl;

    const updated = await prisma.event.update({
        where: { id: req.params.id },
        data: {
            title: title || existing.title,
            description: description !== undefined ? description : existing.description,
            startTime: newStart,
            endTime: newEnd,
            hallId: newHallId,
            category: category || existing.category,
            inviteType: inviteType || existing.inviteType,
            expectedAttendance: expectedAttendance !== undefined ? parseInt(expectedAttendance) : existing.expectedAttendance,
            posterUrl,
        },
        select: buildEventSelect(),
    });

    await auditLog(req.user.id, 'EVENT_UPDATED', req.params.id, { title, startTime, endTime });

    res.json(updated);
});

// DELETE /api/events/:id - Cancel event
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
    const { reason } = req.body;
    const event = await prisma.event.findUnique({ where: { id: req.params.id } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    if (event.createdBy !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Not authorized to cancel this event.' });
    }

    await prisma.event.update({
        where: { id: req.params.id },
        data: { status: 'CANCELLED' },
    });

    await auditLog(req.user.id, 'EVENT_CANCELLED', req.params.id, { reason });

    res.json({ message: 'Event cancelled.' });
});

// GET /api/events/:id/availability - Check hall availability for a date
router.get('/:hallId/availability', async (req, res) => {
    const { date } = req.query;
    if (!date) return res.status(400).json({ error: 'date query param required.' });

    const dayStart = new Date(date);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(date);
    dayEnd.setHours(23, 59, 59, 999);

    const events = await prisma.event.findMany({
        where: {
            hallId: req.params.hallId,
            status: { not: 'CANCELLED' },
            startTime: { gte: dayStart },
            endTime: { lte: dayEnd },
        },
        select: {
            id: true, title: true, startTime: true, endTime: true, status: true,
            creator: { select: { name: true } },
        },
        orderBy: { startTime: 'asc' },
    });
    res.json(events);
});

module.exports = router;
