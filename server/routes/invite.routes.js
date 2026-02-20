const express = require('express');
const supabase = require('../lib/supabase');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { auditLog } = require('../lib/audit');

const router = express.Router();

// POST /api/invites/request
router.post('/request', async (req, res) => {
    const { eventId, requesterName, requesterEmail, requesterInfo } = req.body;
    if (!eventId || !requesterName || !requesterEmail) {
        return res.status(400).json({ error: 'eventId, requesterName, requesterEmail required.' });
    }
    const { data: event } = await supabase.from('Event').select('inviteType').eq('id', eventId).single();
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (event.inviteType !== 'INVITE_ONLY') return res.status(400).json({ error: 'This event is public. No invite needed.' });

    const { data: existing } = await supabase.from('InviteRequest').select('status').eq('eventId', eventId).eq('requesterEmail', requesterEmail).single();
    if (existing) return res.status(409).json({ error: 'You have already submitted an invite request.', status: existing.status });

    const { data: request, error } = await supabase.from('InviteRequest').insert({
        eventId, requesterName, requesterEmail, requesterInfo: requesterInfo || null, status: 'PENDING', createdAt: new Date().toISOString(),
    }).select().single();
    if (error) return res.status(500).json({ error: error.message });

    res.status(201).json({ message: 'Invite request submitted.', request });
});

// GET /api/invites/:eventId
router.get('/:eventId', authenticate, requireAdmin, async (req, res) => {
    const { data: event } = await supabase.from('Event').select('createdBy').eq('id', req.params.eventId).single();
    if (!event) return res.status(404).json({ error: 'Event not found.' });
    if (event.createdBy !== req.user.id && req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Not authorized.' });

    const { data: requests, error } = await supabase.from('InviteRequest').select('*').eq('eventId', req.params.eventId).order('createdAt', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(requests);
});

// PATCH /api/invites/:id
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
    const { status, comment } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ error: 'status must be APPROVED or REJECTED.' });

    const { data: inviteReq } = await supabase.from('InviteRequest').select('*, event:Event(createdBy)').eq('id', req.params.id).single();
    if (!inviteReq) return res.status(404).json({ error: 'Request not found.' });
    if (inviteReq.event.createdBy !== req.user.id && req.user.role !== 'SUPER_ADMIN') return res.status(403).json({ error: 'Not authorized.' });

    const { data: updated } = await supabase.from('InviteRequest').update({ status, comment }).eq('id', req.params.id).select().single();
    await auditLog(req.user.id, `INVITE_${status}`, req.params.id, { eventId: inviteReq.eventId });

    res.json({ message: `Invite request ${status.toLowerCase()}.`, request: updated });
});

module.exports = router;
