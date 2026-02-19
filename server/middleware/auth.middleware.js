const jwt = require('jsonwebtoken');
const prisma = require('../lib/prisma');

async function authenticate(req, res, next) {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'No token provided.' });
    }

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await prisma.user.findUnique({ where: { id: decoded.userId } });
        if (!user || !user.isActive) {
            return res.status(401).json({ error: 'Invalid session.' });
        }
        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired token.' });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || (req.user.role !== 'ADMIN' && req.user.role !== 'SUPER_ADMIN')) {
        return res.status(403).json({ error: 'Admin access required.' });
    }
    if (!req.user.isApproved) {
        return res.status(403).json({ error: 'Your account is pending approval.' });
    }
    next();
}

function requireSuperAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Super Admin access required.' });
    }
    next();
}

module.exports = { authenticate, requireAdmin, requireSuperAdmin };
