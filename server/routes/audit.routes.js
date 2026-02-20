const express = require('express');
const supabase = require('../lib/supabase');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth.middleware');

const router = express.Router();

// GET /api/audit
router.get('/', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const { page = 1, limit = 30, userId, action } = req.query;
    const from = (parseInt(page) - 1) * parseInt(limit);
    const to = from + parseInt(limit) - 1;

    let query = supabase.from('AuditLog')
        .select('*, user:User(name, email)', { count: 'exact' })
        .order('timestamp', { ascending: false })
        .range(from, to);

    if (userId) query = query.eq('userId', userId);
    if (action) query = query.ilike('action', `%${action}%`);

    const { data: logs, count: total, error } = await query;
    if (error) return res.status(500).json({ error: error.message });
    res.json({ logs, total, page: parseInt(page), limit: parseInt(limit) });
});

module.exports = router;
