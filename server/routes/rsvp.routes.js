const express = require('express');
const prisma = require('../lib/prisma');
const { auditLog } = require('../lib/audit');

const router = express.Router();

// POST /api/rsvp - RSVP to an event (public)
router.post('/', async (req, res) => {
    const { eventId, userIdentifier, userName, status } = req.body;

    if (!eventId || !userIdentifier || !userName || !status) {
        return res.status(400).json({ error: 'eventId, userIdentifier, userName, status are required.' });
    }
    if (!['INTERESTED', 'GOING'].includes(status)) {
        return res.status(400).json({ error: 'Status must be INTERESTED or GOING.' });
    }

    const event = await prisma.event.findUnique({
        where: { id: eventId },
        include: { hall: true },
    });
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (event.status === 'CANCELLED') return res.status(400).json({ error: 'Cannot RSVP to a cancelled event.' });
    if (event.inviteType === 'INVITE_ONLY') {
        // Check if they have an approved invite
        const invite = await prisma.inviteRequest.findFirst({
            where: { eventId, requesterEmail: userIdentifier, status: 'APPROVED' },
        });
        if (!invite) {
            return res.status(403).json({ error: 'This event is invite-only. Request an invite first.' });
        }
    }

    // Upsert RSVP
    const rsvp = await prisma.rSVP.upsert({
        where: { eventId_userIdentifier: { eventId, userIdentifier } },
        update: { status, userName },
        create: { eventId, userIdentifier, userName, status },
    });

    // Check capacity
    const going = await prisma.rSVP.count({ where: { eventId, status: 'GOING' } });
    let capacityWarning = null;
    if (going > event.hall.capacity) {
        capacityWarning = `Event is over capacity (${going}/${event.hall.capacity} going).`;
    }

    res.json({ rsvp, going, interested: await prisma.rSVP.count({ where: { eventId, status: 'INTERESTED' } }), capacityWarning });
});

// GET /api/rsvp/:eventId - Get RSVP counts for an event
router.get('/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const [going, interested] = await Promise.all([
        prisma.rSVP.count({ where: { eventId, status: 'GOING' } }),
        prisma.rSVP.count({ where: { eventId, status: 'INTERESTED' } }),
    ]);
    res.json({ going, interested });
});

// DELETE /api/rsvp - Cancel RSVP
router.delete('/', async (req, res) => {
    const { eventId, userIdentifier } = req.body;
    await prisma.rSVP.deleteMany({ where: { eventId, userIdentifier } });
    res.json({ message: 'RSVP cancelled.' });
});

module.exports = router;
