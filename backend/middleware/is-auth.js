import jwt from 'jsonwebtoken';

const isAuth = async (req, res, next) => {
  // ── defaults ───────────────────────────────────────────────────────
  req.isAuth = false;
  req.userId = null;
  req.userRole = null;
  req.userCollege = null;

  // ── extract token (cookie first, then Authorization header) ────────
  let token = req.cookies?.secretToken || '';

  if (!token) {
    const authHeader = req.headers['authorization'];   // lowercase — HTTP headers are case-insensitive
    if (authHeader) {
      const auth_type = authHeader.split(' ')[0];
      token = auth_type === 'Bearer' ? authHeader.split(' ')[1] : '';
    }
  }

  if (!token) return next();

  // ── verify token ───────────────────────────────────────────────────
  let decodedToken;
  try {
    decodedToken = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
  } catch (err) {
    // token expired or tampered — just continue as unauthenticated
    return next();
  }

  if (!decodedToken) return next();

  // ── attach everything resolvers need ───────────────────────────────
  req.isAuth     = true;
  req.userId     = decodedToken.userId;
  req.userRole   = decodedToken.role;        // 'student' | 'college_admin' | 'super_admin'
  req.userCollege = decodedToken.college;    // college ObjectId string, null for super_admin

  // ── keep isDeanAuth for any old resolver code not updated yet ──────
  req.isDeanAuth = decodedToken.role === 'college_admin';

  next();
};

export default isAuth;