const express = require('express');
const prisma = require('../lib/prisma');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { auditLog } = require('../lib/audit');

const router = express.Router();

// POST /api/invites/request - Public user requests invite
router.post('/request', async (req, res) => {
    const { eventId, requesterName, requesterEmail, requesterInfo } = req.body;

    if (!eventId || !requesterName || !requesterEmail) {
        return res.status(400).json({ error: 'eventId, requesterName, requesterEmail required.' });
    }

    const event = await prisma.event.findUnique({ where: { id: eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (event.inviteType !== 'INVITE_ONLY') {
        return res.status(400).json({ error: 'This event is public. No invite needed.' });
    }

    // Check if already requested
    const existing = await prisma.inviteRequest.findFirst({
        where: { eventId, requesterEmail },
    });
    if (existing) {
        return res.status(409).json({ error: 'You have already submitted an invite request.', status: existing.status });
    }

    const request = await prisma.inviteRequest.create({
        data: { eventId, requesterName, requesterEmail, requesterInfo },
    });

    res.status(201).json({ message: 'Invite request submitted.', request });
});

// GET /api/invites/:eventId - Get invite requests for an event (admin only)
router.get('/:eventId', authenticate, requireAdmin, async (req, res) => {
    const event = await prisma.event.findUnique({ where: { id: req.params.eventId } });
    if (!event) return res.status(404).json({ error: 'Event not found.' });

    if (event.createdBy !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Not authorized.' });
    }

    const requests = await prisma.inviteRequest.findMany({
        where: { eventId: req.params.eventId },
        orderBy: { createdAt: 'desc' },
    });
    res.json(requests);
});

// PATCH /api/invites/:id - Approve/reject invite request
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
    const { status, comment } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ error: 'status must be APPROVED or REJECTED.' });
    }

    const inviteReq = await prisma.inviteRequest.findUnique({
        where: { id: req.params.id },
        include: { event: true },
    });
    if (!inviteReq) return res.status(404).json({ error: 'Request not found.' });

    if (inviteReq.event.createdBy !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Not authorized.' });
    }

    const updated = await prisma.inviteRequest.update({
        where: { id: req.params.id },
        data: { status, comment },
    });

    await auditLog(req.user.id, `INVITE_${status}`, req.params.id, { eventId: inviteReq.eventId });

    res.json({ message: `Invite request ${status.toLowerCase()}.`, request: updated });
});

module.exports = router;
