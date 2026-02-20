const express = require('express');
const supabase = require('../lib/supabase');
const { auditLog } = require('../lib/audit');

const router = express.Router();

// POST /api/rsvp
router.post('/', async (req, res) => {
    const { eventId, userIdentifier, userName, status } = req.body;
    if (!eventId || !userIdentifier || !userName || !status) {
        return res.status(400).json({ error: 'eventId, userIdentifier, userName, status are required.' });
    }
    if (!['INTERESTED', 'GOING'].includes(status)) {
        return res.status(400).json({ error: 'Status must be INTERESTED or GOING.' });
    }

    const { data: event } = await supabase.from('Event').select('*, hall:Hall(capacity)').eq('id', eventId).single();
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (event.status === 'CANCELLED') return res.status(400).json({ error: 'Cannot RSVP to a cancelled event.' });

    if (event.inviteType === 'INVITE_ONLY') {
        const { data: invite } = await supabase.from('InviteRequest')
            .select('id').eq('eventId', eventId).eq('requesterEmail', userIdentifier).eq('status', 'APPROVED').single();
        if (!invite) return res.status(403).json({ error: 'This event is invite-only. Request an invite first.' });
    }

    // Upsert RSVP
    const { data: existing } = await supabase.from('RSVP').select('id').eq('eventId', eventId).eq('userIdentifier', userIdentifier).single();
    let rsvp;
    if (existing) {
        const r = await supabase.from('RSVP').update({ status, userName }).eq('id', existing.id).select().single();
        rsvp = r.data;
    } else {
        const r = await supabase.from('RSVP').insert({ eventId, userIdentifier, userName, status, createdAt: new Date().toISOString() }).select().single();
        rsvp = r.data;
    }

    const { count: going } = await supabase.from('RSVP').select('id', { count: 'exact', head: true }).eq('eventId', eventId).eq('status', 'GOING');
    const { count: interested } = await supabase.from('RSVP').select('id', { count: 'exact', head: true }).eq('eventId', eventId).eq('status', 'INTERESTED');
    const capacityWarning = (going ?? 0) > (event.hall?.capacity ?? 9999) ? `Event is over capacity (${going}/${event.hall?.capacity} going).` : null;

    res.json({ rsvp, going, interested, capacityWarning });
});

// GET /api/rsvp/:eventId
router.get('/:eventId', async (req, res) => {
    const { eventId } = req.params;
    const [{ count: going }, { count: interested }] = await Promise.all([
        supabase.from('RSVP').select('id', { count: 'exact', head: true }).eq('eventId', eventId).eq('status', 'GOING'),
        supabase.from('RSVP').select('id', { count: 'exact', head: true }).eq('eventId', eventId).eq('status', 'INTERESTED'),
    ]);
    res.json({ going, interested });
});

// DELETE /api/rsvp
router.delete('/', async (req, res) => {
    const { eventId, userIdentifier } = req.body;
    await supabase.from('RSVP').delete().eq('eventId', eventId).eq('userIdentifier', userIdentifier);
    res.json({ message: 'RSVP cancelled.' });
});

module.exports = router;
