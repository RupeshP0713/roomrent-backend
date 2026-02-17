const roleMiddleware = (roles) => {
    return (req, res, next) => {
        // req.user is set by authMiddleware
        if (!req.user) {
            return res.status(401).json({ msg: 'Unauthorized: No user found' });
        }

        if (!roles.includes(req.user.role)) {
            return res.status(403).json({ msg: 'Forbidden: Access denied for this role' });
        }

        next();
    };
};

module.exports = roleMiddleware;
