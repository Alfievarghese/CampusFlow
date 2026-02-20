const supabase = require('../lib/supabase');

async function auditLog(userId, action, targetId = null, details = null) {
    try {
        await supabase.from('AuditLog').insert({
            userId,
            action,
            targetId,
            details: details ? JSON.stringify(details) : null,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        console.error('[AUDIT LOG ERROR]', err.message);
    }
}

module.exports = { auditLog };

// Audit log entries are immutable. Never add DELETE routes for audit logs.
