const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { checkConflicts } = require('../lib/conflictEngine');
const { auditLog } = require('../lib/audit');

const router = express.Router();

// POST /api/conflicts/check - Pre-check before booking
router.post('/check', authenticate, requireAdmin, async (req, res) => {
    const { hallId, startTime, endTime } = req.body;
    if (!hallId || !startTime || !endTime) {
        return res.status(400).json({ error: 'hallId, startTime, endTime required.' });
    }
    const result = await checkConflicts(hallId, new Date(startTime), new Date(endTime));
    res.json(result);
});

// POST /api/conflicts/request-override - Admin requests to take a conflicting slot
router.post('/request-override', authenticate, requireAdmin, async (req, res) => {
    const { conflictEventId, newEventTitle, newEventStart, newEventEnd, hallId, reason } = req.body;
    if (!conflictEventId || !newEventTitle || !newEventStart || !newEventEnd || !hallId || !reason) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const conflictEvent = await prisma.event.findUnique({ where: { id: conflictEventId } });
    if (!conflictEvent) return res.status(404).json({ error: 'Conflicting event not found.' });

    // Create the conflict request
    const request = await prisma.conflictRequest.create({
        data: {
            conflictEventId,
            requestedById: req.user.id,
            newEventTitle,
            newEventStart: new Date(newEventStart),
            newEventEnd: new Date(newEventEnd),
            hallId,
            reason,
            status: 'PENDING',
        },
        include: {
            requestedBy: { select: { name: true, email: true } },
            event: { select: { title: true, startTime: true, endTime: true, creator: { select: { name: true, email: true } } } },
        },
    });

    // Mark conflicting event as having a conflict request
    await prisma.event.update({
        where: { id: conflictEventId },
        data: { status: 'CONFLICT_REQUESTED' },
    });

    await auditLog(req.user.id, 'CONFLICT_OVERRIDE_REQUESTED', conflictEventId, { newEventTitle, reason });

    res.status(201).json({ message: 'Override request submitted.', request });
});

// GET /api/conflicts - Get conflict requests (for event owner or super admin)
router.get('/', authenticate, requireAdmin, async (req, res) => {
    let where = {};
    if (req.user.role !== 'SUPER_ADMIN') {
        // Show only requests concerning this admin's events
        const myEvents = await prisma.event.findMany({
            where: { createdBy: req.user.id },
            select: { id: true },
        });
        const myEventIds = myEvents.map(e => e.id);
        where.conflictEventId = { in: myEventIds };
    }

    const requests = await prisma.conflictRequest.findMany({
        where,
        include: {
            requestedBy: { select: { name: true, email: true } },
            event: {
                select: {
                    id: true, title: true, startTime: true, endTime: true,
                    creator: { select: { name: true, email: true } },
                    hall: { select: { name: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
});

// GET /api/conflicts/my-outgoing - Requests I made
router.get('/my-outgoing', authenticate, requireAdmin, async (req, res) => {
    const requests = await prisma.conflictRequest.findMany({
        where: { requestedById: req.user.id },
        include: {
            event: {
                select: {
                    id: true, title: true, startTime: true, endTime: true,
                    hall: { select: { name: true } },
                    creator: { select: { name: true } },
                },
            },
        },
        orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
});

// PATCH /api/conflicts/:id - Accept or Reject (event owner)
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
    const { status, comment } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ error: 'status must be APPROVED or REJECTED.' });
    }

    const conflictReq = await prisma.conflictRequest.findUnique({
        where: { id: req.params.id },
        include: { event: true },
    });
    if (!conflictReq) return res.status(404).json({ error: 'Request not found.' });

    // Check ownership or super admin
    if (conflictReq.event.createdBy !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only the event owner can respond to this request.' });
    }

    await prisma.conflictRequest.update({
        where: { id: req.params.id },
        data: { status, comment },
    });

    // If approved, cancel the original event so new one can be booked
    if (status === 'APPROVED') {
        await prisma.event.update({
            where: { id: conflictReq.conflictEventId },
            data: { status: 'CANCELLED' },
        });
        await auditLog(req.user.id, 'CONFLICT_OVERRIDE_APPROVED', conflictReq.conflictEventId, { comment });
    } else {
        // Restore event status
        await prisma.event.update({
            where: { id: conflictReq.conflictEventId },
            data: { status: 'CONFIRMED' },
        });
        await auditLog(req.user.id, 'CONFLICT_OVERRIDE_REJECTED', req.params.id, { comment });
    }

    res.json({ message: `Request ${status.toLowerCase()}.` });
});

module.exports = router;
