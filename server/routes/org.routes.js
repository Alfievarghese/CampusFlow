const express = require('express');
const { v4: uuidv4 } = require('uuid');
const supabase = require('../lib/supabase');
const { authenticate, requireAdmin, requireSuperAdmin } = require('../middleware/auth.middleware');
const { auditLog } = require('../lib/audit');

const router = express.Router();

// ─── Helper: check org permission ───
async function hasOrgPermission(userId, orgId, permission) {
    const { data: member } = await supabase
        .from('OrgMember')
        .select('role, permissions')
        .eq('userId', userId)
        .eq('organizationId', orgId)
        .single();
    if (!member) return false;
    if (member.role === 'ORG_HEAD') return true;
    const perms = JSON.parse(member.permissions || '[]');
    return perms.includes(permission);
}

// ─── GET /api/orgs — List all orgs ───
router.get('/', authenticate, requireAdmin, async (req, res) => {
    const { data: orgs, error } = await supabase
        .from('Organization')
        .select('*')
        .eq('isActive', true)
        .order('name', { ascending: true });
    if (error) return res.status(500).json({ error: error.message });
    res.json(orgs);
});

// ─── GET /api/orgs/:id — Org detail with members ───
router.get('/:id', authenticate, requireAdmin, async (req, res) => {
    const { data: org } = await supabase.from('Organization').select('*').eq('id', req.params.id).single();
    if (!org) return res.status(404).json({ error: 'Organization not found.' });

    const { data: members } = await supabase
        .from('OrgMember')
        .select('id, userId, role, permissions, createdAt, user:User(id, name, email)')
        .eq('organizationId', req.params.id)
        .order('createdAt', { ascending: true });

    res.json({ ...org, members: members || [] });
});

// ─── POST /api/orgs — Create org (SUPER_ADMIN only) ───
router.post('/', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    const { name, description } = req.body;
    if (!name) return res.status(400).json({ error: 'Organization name is required.' });

    const { data: existing } = await supabase.from('Organization').select('id').eq('name', name).single();
    if (existing) return res.status(409).json({ error: 'An organization with this name already exists.' });

    const { data: org, error } = await supabase.from('Organization').insert({
        id: uuidv4(), name, description: description || null, isActive: true, createdAt: new Date().toISOString(),
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    await auditLog(req.user.id, 'ORG_CREATED', org.id, { name });
    res.status(201).json(org);
});

// ─── PATCH /api/orgs/:id — Edit org ───
router.patch('/:id', authenticate, requireAdmin, async (req, res) => {
    // Only ORG_HEAD with EDIT_ORG permission or SUPER_ADMIN
    if (req.user.role !== 'SUPER_ADMIN') {
        const allowed = await hasOrgPermission(req.user.id, req.params.id, 'EDIT_ORG');
        if (!allowed) return res.status(403).json({ error: 'Not authorized to edit this organization.' });
    }
    const { name, description } = req.body;
    const updateData = {};
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;

    const { data: org, error } = await supabase.from('Organization').update(updateData).eq('id', req.params.id).select().single();
    if (error) return res.status(500).json({ error: error.message });
    await auditLog(req.user.id, 'ORG_UPDATED', org.id, { name });
    res.json(org);
});

// ─── DELETE /api/orgs/:id — Deactivate org (SUPER_ADMIN) ───
router.delete('/:id', authenticate, requireAdmin, requireSuperAdmin, async (req, res) => {
    await supabase.from('Organization').update({ isActive: false }).eq('id', req.params.id);
    await auditLog(req.user.id, 'ORG_DEACTIVATED', req.params.id);
    res.json({ message: 'Organization deactivated.' });
});

// ─── POST /api/orgs/:id/members — Add member ───
router.post('/:id/members', authenticate, requireAdmin, async (req, res) => {
    if (req.user.role !== 'SUPER_ADMIN') {
        const allowed = await hasOrgPermission(req.user.id, req.params.id, 'MANAGE_MEMBERS');
        if (!allowed) return res.status(403).json({ error: 'Not authorized to manage members.' });
    }

    const { userId, role, permissions } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const { data: existingMember } = await supabase.from('OrgMember')
        .select('id').eq('userId', userId).eq('organizationId', req.params.id).single();
    if (existingMember) return res.status(409).json({ error: 'User is already a member of this organization.' });

    const { data: member, error } = await supabase.from('OrgMember').insert({
        id: uuidv4(),
        userId,
        organizationId: req.params.id,
        role: role || 'MEMBER',
        permissions: JSON.stringify(permissions || []),
        createdAt: new Date().toISOString(),
    }).select('id, userId, role, permissions, createdAt, user:User(id, name, email)').single();

    if (error) return res.status(500).json({ error: error.message });
    await auditLog(req.user.id, 'ORG_MEMBER_ADDED', member.id, { userId, orgId: req.params.id, role: role || 'MEMBER' });
    res.status(201).json(member);
});

// ─── PATCH /api/orgs/:id/members/:memberId — Update member role/permissions ───
router.patch('/:id/members/:memberId', authenticate, requireAdmin, async (req, res) => {
    if (req.user.role !== 'SUPER_ADMIN') {
        const allowed = await hasOrgPermission(req.user.id, req.params.id, 'MANAGE_MEMBERS');
        if (!allowed) return res.status(403).json({ error: 'Not authorized.' });
    }

    const { role, permissions } = req.body;
    const updateData = {};
    if (role) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = JSON.stringify(permissions);

    const { data: member, error } = await supabase.from('OrgMember')
        .update(updateData)
        .eq('id', req.params.memberId)
        .eq('organizationId', req.params.id)
        .select('id, userId, role, permissions, createdAt, user:User(id, name, email)')
        .single();

    if (error) return res.status(500).json({ error: error.message });
    await auditLog(req.user.id, 'ORG_MEMBER_UPDATED', req.params.memberId, { role, permissions });
    res.json(member);
});

// ─── DELETE /api/orgs/:id/members/:memberId — Remove member ───
router.delete('/:id/members/:memberId', authenticate, requireAdmin, async (req, res) => {
    if (req.user.role !== 'SUPER_ADMIN') {
        const allowed = await hasOrgPermission(req.user.id, req.params.id, 'MANAGE_MEMBERS');
        if (!allowed) return res.status(403).json({ error: 'Not authorized.' });
    }

    const { error } = await supabase.from('OrgMember').delete().eq('id', req.params.memberId).eq('organizationId', req.params.id);
    if (error) return res.status(500).json({ error: error.message });
    await auditLog(req.user.id, 'ORG_MEMBER_REMOVED', req.params.memberId);
    res.json({ message: 'Member removed.' });
});

// ─── GET /api/orgs/my/memberships — Current user's org memberships ───
router.get('/my/memberships', authenticate, async (req, res) => {
    const { data: memberships, error } = await supabase
        .from('OrgMember')
        .select('id, role, permissions, createdAt, organization:Organization(id, name, description, logoUrl)')
        .eq('userId', req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(memberships || []);
});

module.exports = router;
