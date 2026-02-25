const express = require('express');
const supabase = require('../lib/supabase');
const { v4: uuidv4 } = require('uuid');
const { authenticate, requireAdmin } = require('../middleware/auth.middleware');
const { checkConflicts } = require('../lib/conflictEngine');
const { auditLog } = require('../lib/audit');

const router = express.Router();

// POST /api/conflicts/check
router.post('/check', authenticate, requireAdmin, async (req, res) => {
    const { hallId, startTime, endTime } = req.body;
    if (!hallId || !startTime || !endTime) return res.status(400).json({ error: 'hallId, startTime, endTime required.' });
    const result = await checkConflicts(hallId, new Date(startTime), new Date(endTime));
    res.json(result);
});

// POST /api/conflicts/request-override
router.post('/request-override', authenticate, requireAdmin, async (req, res) => {
    const { conflictEventId, newEventTitle, newEventStart, newEventEnd, hallId, reason } = req.body;
    if (!conflictEventId || !newEventTitle || !newEventStart || !newEventEnd || !hallId || !reason) {
        return res.status(400).json({ error: 'All fields are required.' });
    }

    const { data: conflictEvent } = await supabase.from('Event').select('id').eq('id', conflictEventId).single();
    if (!conflictEvent) return res.status(404).json({ error: 'Conflicting event not found.' });

    const { data: request, error } = await supabase.from('ConflictRequest').insert({
        id: uuidv4(), conflictEventId, requestedById: req.user.id, newEventTitle,
        newEventStart: new Date(newEventStart).toISOString(),
        newEventEnd: new Date(newEventEnd).toISOString(),
        hallId, reason, status: 'PENDING', createdAt: new Date().toISOString(),
    }).select('*, requestedBy:User(name, email), event:Event(title, startTime, endTime)').single();

    if (error) return res.status(500).json({ error: error.message });

    await supabase.from('Event').update({ status: 'CONFLICT_REQUESTED' }).eq('id', conflictEventId);
    await auditLog(req.user.id, 'CONFLICT_OVERRIDE_REQUESTED', conflictEventId, { newEventTitle, reason });

    res.status(201).json({ message: 'Override request submitted.', request });
});

// GET /api/conflicts
router.get('/', authenticate, requireAdmin, async (req, res) => {
    let query = supabase.from('ConflictRequest')
        .select('*, requestedBy:User(name, email), event:Event(id, title, startTime, endTime, hall:Hall(name), creator:User(name, email))')
        .order('createdAt', { ascending: false });

    if (req.user.role !== 'SUPER_ADMIN') {
        const { data: myEvents } = await supabase.from('Event').select('id').eq('createdBy', req.user.id);
        const myEventIds = (myEvents || []).map(e => e.id);
        if (myEventIds.length === 0) return res.json([]);
        query = query.in('conflictEventId', myEventIds);
    }

    const { data: requests, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json(requests);
});

// GET /api/conflicts/my-outgoing
router.get('/my-outgoing', authenticate, requireAdmin, async (req, res) => {
    const { data: requests, error } = await supabase.from('ConflictRequest')
        .select('*, event:Event(id, title, startTime, endTime, hall:Hall(name), creator:User(name))')
        .eq('requestedById', req.user.id)
        .order('createdAt', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(requests);
});

// PATCH /api/conflicts/:id
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
    const { status, comment } = req.body;
    if (!['APPROVED', 'REJECTED'].includes(status)) return res.status(400).json({ error: 'status must be APPROVED or REJECTED.' });

    const { data: conflictReq } = await supabase.from('ConflictRequest').select('*, event:Event(createdBy)').eq('id', req.params.id).single();
    if (!conflictReq) return res.status(404).json({ error: 'Request not found.' });
    if (conflictReq.event.createdBy !== req.user.id && req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Only the event owner can respond to this request.' });
    }

    await supabase.from('ConflictRequest').update({ status, comment }).eq('id', req.params.id);

    if (status === 'APPROVED') {
        await supabase.from('Event').update({ status: 'CANCELLED' }).eq('id', conflictReq.conflictEventId);
        await auditLog(req.user.id, 'CONFLICT_OVERRIDE_APPROVED', conflictReq.conflictEventId, { comment });
    } else {
        await supabase.from('Event').update({ status: 'CONFIRMED' }).eq('id', conflictReq.conflictEventId);
        await auditLog(req.user.id, 'CONFLICT_OVERRIDE_REJECTED', req.params.id, { comment });
    }

    res.json({ message: `Request ${status.toLowerCase()}.` });
});

module.exports = router;
