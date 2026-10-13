const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
    const authHeader = req.headers.authorization;

    // Check whether the Authorization header exists
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({
            message: 'Authentication required. Please log in.'
        });
    }

    // Ensure the backend has a JWT secret
    if (!process.env.JWT_SECRET) {
        console.error('Authentication error: JWT_SECRET is not configured.');

        return res.status(500).json({
            message: 'Authentication service is not configured.'
        });
    }

    // Extract the token
    const token = authHeader.slice(7).trim();

    if (!token) {
        return res.status(401).json({
            message: 'Authentication token is missing.'
        });
    }

    try {
        // Verify the token using the same settings as the login route
        const decoded = jwt.verify(
            token,
            process.env.JWT_SECRET,
            {
                issuer: 'smartbite-api',
                audience: 'smartbite-client',
                algorithms: ['HS256']
            }
        );

        // Validate the required token claims
        if (
            typeof decoded.sub !== 'string' ||
            !decoded.sub ||
            !['customer', 'admin'].includes(decoded.role)
        ) {
            return res.status(401).json({
                message: 'Invalid authentication token.'
            });
        }

        // Store authenticated user details for the route
        req.user = {
            id: decoded.sub,
            role: decoded.role
        };

        next();
    } catch (error) {
        // Log the reason without exposing the token
        console.error('JWT verification failed:', error.message);

        return res.status(401).json({
            message: 'Invalid or expired authentication token. Please log in again.'
        });
    }
}

function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            message: 'Access denied. Administrator privileges required.'
        });
    }

    next();
}

module.exports = {
    authenticateToken,
    requireAdmin
};