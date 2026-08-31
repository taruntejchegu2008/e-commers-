// ===== Admin Authorization Middleware =====
// Must be used AFTER the `protect` middleware so that req.user is populated.

const admin = (req, res, next) => {
  if (req.user && req.user.isAdmin) {
    next();
  } else {
    return res.status(403).json({ message: 'Access denied. Admin privileges required.' });
  }
};

module.exports = { admin };
