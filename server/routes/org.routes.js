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
        .select('role, permissions, powerRank, orgRole:OrgRole(permissions, powerRank)')
        .eq('userId', userId)
        .eq('organizationId', orgId)
        .single();
    if (!member) return null; // Return member object instead of boolean for hierarchy checks

    if (member.orgRole && !Array.isArray(member.orgRole)) {
        member.permissions = member.orgRole.permissions;
        member.powerRank = member.orgRole.powerRank;
    }

    if (member.role === 'ORG_HEAD') return member;

    // Add member object to the returned truthy value 
    const perms = JSON.parse(member.permissions || '[]');
    if (perms.includes(permission)) return member;

    return null;
}

// ─── Helper: check global system permission ───
function hasSystemPerm(user, perm) {
    if (user.role === 'SUPER_ADMIN') return true;
    try {
        const perms = JSON.parse(user.systemPermissions || '[]');
        return perms.includes(perm);
    } catch { return false; }
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
        .select('id, userId, role, permissions, powerRank, createdAt, user:User(id, name, email)')
        .eq('organizationId', req.params.id)
        .order('createdAt', { ascending: true });

    res.json({ ...org, members: members || [] });
});

// ─── POST /api/orgs — Create org (Requires CREATE_ORGANIZATIONS or SUPER_ADMIN) ───
router.post('/', authenticate, requireAdmin, async (req, res) => {
    if (!hasSystemPerm(req.user, 'CREATE_ORGANIZATIONS')) {
        return res.status(403).json({ error: 'You do not have permission to create organizations.' });
    }

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

// ─── GET /api/orgs/:id/roles — List roles ───
router.get('/:id/roles', authenticate, requireAdmin, async (req, res) => {
    const { data: roles, error } = await supabase
        .from('OrgRole')
        .select('*')
        .eq('organizationId', req.params.id)
        .order('powerRank', { ascending: false });
    if (error) return res.status(500).json({ error: error.message });
    res.json(roles || []);
});

// ─── POST /api/orgs/:id/roles — Create role ───
router.post('/:id/roles', authenticate, requireAdmin, async (req, res) => {
    let actorMember = null;
    if (req.user.role !== 'SUPER_ADMIN') {
        actorMember = await hasOrgPermission(req.user.id, req.params.id, 'ASSIGN_POWERS');
        const legacyMember = await hasOrgPermission(req.user.id, req.params.id, 'MANAGE_MEMBERS');
        if (!actorMember && legacyMember) actorMember = legacyMember;
        if (!actorMember) return res.status(403).json({ error: 'Not authorized.' });
    }

    const { name, permissions, powerRank } = req.body;
    if (!name) return res.status(400).json({ error: 'Role name is required.' });

    const targetRank = parseInt(powerRank) || 0;
    if (req.user.role !== 'SUPER_ADMIN' && actorMember) {
        if (targetRank > actorMember.powerRank) {
            return res.status(403).json({ error: `Cannot assign power rank higher than your own.` });
        }
    }

    const { data: role, error } = await supabase.from('OrgRole').insert({
        id: uuidv4(),
        organizationId: req.params.id,
        name,
        permissions: JSON.stringify(permissions || []),
        powerRank: targetRank,
        createdAt: new Date().toISOString()
    }).select().single();

    if (error) return res.status(500).json({ error: error.message });
    res.status(201).json(role);
});

// ─── PATCH /api/orgs/:id/roles/:roleId — Edit role ───
router.patch('/:id/roles/:roleId', authenticate, requireAdmin, async (req, res) => {
    let actorMember = null;
    if (req.user.role !== 'SUPER_ADMIN') {
        actorMember = await hasOrgPermission(req.user.id, req.params.id, 'ASSIGN_POWERS');
        if (!actorMember) actorMember = await hasOrgPermission(req.user.id, req.params.id, 'MANAGE_MEMBERS');
        if (!actorMember) return res.status(403).json({ error: 'Not authorized.' });
    }

    const { data: targetRole } = await supabase.from('OrgRole').select('powerRank').eq('id', req.params.roleId).single();
    if (!targetRole) return res.status(404).json({ error: 'Role not found.' });

    const { name, permissions, powerRank } = req.body;
    const targetRank = powerRank !== undefined ? parseInt(powerRank) : targetRole.powerRank;

    if (req.user.role !== 'SUPER_ADMIN' && actorMember) {
        if (targetRole.powerRank >= actorMember.powerRank) {
            return res.status(403).json({ error: 'Cannot modify role with equal or higher power rank.' });
        }
        if (targetRank > actorMember.powerRank) {
            return res.status(403).json({ error: 'Cannot assign power rank higher than your own.' });
        }
    }

    const updateData = {};
    if (name) updateData.name = name;
    if (permissions !== undefined) updateData.permissions = JSON.stringify(permissions);
    if (powerRank !== undefined) updateData.powerRank = targetRank;

    const { data: role, error } = await supabase.from('OrgRole').update(updateData).eq('id', req.params.roleId).select().single();
    if (error) return res.status(500).json({ error: error.message });
    res.json(role);
});

// ─── DELETE /api/orgs/:id/roles/:roleId — Delete role ───
router.delete('/:id/roles/:roleId', authenticate, requireAdmin, async (req, res) => {
    let actorMember = null;
    if (req.user.role !== 'SUPER_ADMIN') {
        actorMember = await hasOrgPermission(req.user.id, req.params.id, 'ASSIGN_POWERS');
        if (!actorMember) actorMember = await hasOrgPermission(req.user.id, req.params.id, 'MANAGE_MEMBERS');
        if (!actorMember) return res.status(403).json({ error: 'Not authorized.' });
    }

    const { data: targetRole } = await supabase.from('OrgRole').select('powerRank').eq('id', req.params.roleId).single();
    if (!targetRole) return res.status(404).json({ error: 'Role not found.' });

    if (req.user.role !== 'SUPER_ADMIN' && actorMember) {
        if (targetRole.powerRank >= actorMember.powerRank) {
            return res.status(403).json({ error: 'Cannot delete role with equal or higher power rank.' });
        }
    }

    const { error } = await supabase.from('OrgRole').delete().eq('id', req.params.roleId);
    if (error) return res.status(500).json({ error: error.message });
    res.json({ message: 'Role deleted.' });
});

// ─── POST /api/orgs/:id/members — Add member ───
router.post('/:id/members', authenticate, requireAdmin, async (req, res) => {
    let actorMember = null;
    if (req.user.role !== 'SUPER_ADMIN') {
        actorMember = await hasOrgPermission(req.user.id, req.params.id, 'ASSIGN_POWERS');
        const legacyMember = await hasOrgPermission(req.user.id, req.params.id, 'MANAGE_MEMBERS');
        if (!actorMember && legacyMember) actorMember = legacyMember;

        if (!actorMember) return res.status(403).json({ error: 'Not authorized to manage members or assign powers.' });
    }

    const { userId, role, permissions, powerRank, orgRoleId } = req.body;
    if (!userId) return res.status(400).json({ error: 'userId is required.' });

    const targetRank = parseInt(powerRank) || 0;
    if (req.user.role !== 'SUPER_ADMIN' && actorMember) {
        if (targetRank > actorMember.powerRank) {
            return res.status(403).json({ error: `Cannot assign a power rank (${targetRank}) higher than your own (${actorMember.powerRank}).` });
        }
    }

    const { data: existingMember } = await supabase.from('OrgMember')
        .select('id').eq('userId', userId).eq('organizationId', req.params.id).single();
    if (existingMember) return res.status(409).json({ error: 'User is already a member of this organization.' });

    const insertData = {
        id: uuidv4(),
        userId,
        organizationId: req.params.id,
        role: role || 'MEMBER',
        permissions: JSON.stringify(permissions || []),
        powerRank: targetRank,
        createdAt: new Date().toISOString()
    };
    if (orgRoleId) insertData.orgRoleId = orgRoleId;

    const { data: member, error } = await supabase.from('OrgMember').insert(insertData).select('id, userId, role, orgRoleId, permissions, powerRank, createdAt, user:User(id, name, email)').single();

    if (error) return res.status(500).json({ error: error.message });
    await auditLog(req.user.id, 'ORG_MEMBER_ADDED', member.id, { userId, orgId: req.params.id, role: role || 'MEMBER' });
    res.status(201).json(member);
});

// ─── PATCH /api/orgs/:id/members/:memberId — Update member role/permissions ───
router.patch('/:id/members/:memberId', authenticate, requireAdmin, async (req, res) => {
    let actorMember = null;
    if (req.user.role !== 'SUPER_ADMIN') {
        actorMember = await hasOrgPermission(req.user.id, req.params.id, 'ASSIGN_POWERS');
        const legacyMember = await hasOrgPermission(req.user.id, req.params.id, 'MANAGE_MEMBERS');
        if (!actorMember && legacyMember) actorMember = legacyMember;

        if (!actorMember) return res.status(403).json({ error: 'Not authorized.' });
    }

    const { role, permissions, powerRank, orgRoleId } = req.body;

    const { data: targetMember } = await supabase.from('OrgMember').select('userId, powerRank').eq('id', req.params.memberId).eq('organizationId', req.params.id).single();
    if (!targetMember) return res.status(404).json({ error: 'Member not found.' });

    if (req.user.role !== 'SUPER_ADMIN' && actorMember) {
        if (targetMember.powerRank >= actorMember.powerRank && req.user.id !== targetMember.userId) {
            return res.status(403).json({ error: 'You cannot modify a member with an equal or higher power rank.' });
        }
        if (powerRank !== undefined && parseInt(powerRank) > actorMember.powerRank) {
            return res.status(403).json({ error: `Cannot assign power rank higher than your own (${actorMember.powerRank}).` });
        }
    }

    const updateData = {};
    if (role) updateData.role = role;
    if (permissions !== undefined) updateData.permissions = JSON.stringify(permissions);
    if (powerRank !== undefined) updateData.powerRank = parseInt(powerRank);
    if (orgRoleId !== undefined) updateData.orgRoleId = orgRoleId === '' ? null : orgRoleId;

    const { data: member, error } = await supabase.from('OrgMember')
        .update(updateData)
        .eq('id', req.params.memberId)
        .eq('organizationId', req.params.id)
        .select('id, userId, role, orgRoleId, permissions, powerRank, createdAt, user:User(id, name, email)')
        .single();

    if (error) return res.status(500).json({ error: error.message });
    await auditLog(req.user.id, 'ORG_MEMBER_UPDATED', req.params.memberId, { role, permissions });
    res.json(member);
});

// ─── DELETE /api/orgs/:id/members/:memberId — Remove member ───
router.delete('/:id/members/:memberId', authenticate, requireAdmin, async (req, res) => {
    let actorMember = null;
    if (req.user.role !== 'SUPER_ADMIN') {
        actorMember = await hasOrgPermission(req.user.id, req.params.id, 'MANAGE_MEMBERS');
        if (!actorMember) return res.status(403).json({ error: 'Not authorized.' });
    }

    const { data: targetMember } = await supabase.from('OrgMember').select('userId, powerRank').eq('id', req.params.memberId).eq('organizationId', req.params.id).single();
    if (!targetMember) return res.status(404).json({ error: 'Member not found.' });

    if (req.user.role !== 'SUPER_ADMIN' && actorMember) {
        if (targetMember.powerRank >= actorMember.powerRank && req.user.id !== targetMember.userId) {
            return res.status(403).json({ error: 'You cannot remove a member with an equal or higher power rank.' });
        }
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
        .select('id, role, permissions, powerRank, createdAt, organization:Organization(id, name, description, logoUrl)')
        .eq('userId', req.user.id);
    if (error) return res.status(500).json({ error: error.message });
    res.json(memberships || []);
});

module.exports = router;
