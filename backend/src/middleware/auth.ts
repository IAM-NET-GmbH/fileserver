import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { UserRepository, User } from '../repositories/UserRepository';

const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const userRepository = new UserRepository();

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
}

export interface AuthRequest extends Request {
  user?: AuthUser;
}

// Check if users exist in database
export const hasUsers = async (): Promise<boolean> => {
  return await userRepository.hasUsers();
};

export const generateToken = (user: AuthUser): string => {
  return jwt.sign(user, JWT_SECRET, { expiresIn: '7d' });
};

export const verifyToken = (token: string): AuthUser | null => {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthUser;
  } catch (error) {
    return null;
  }
};

export const authenticateUser = async (email: string, password: string): Promise<AuthUser | null> => {
  const user = await userRepository.authenticateUser(email, password);
  return user;
};

// Middleware to require authentication
export const requireAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      success: false,
      error: 'Authentication required',
      timestamp: new Date().toISOString()
    });
    return;
  }

  const token = authHeader.substring(7);
  const user = verifyToken(token);

  if (!user) {
    res.status(401).json({
      success: false,
      error: 'Invalid or expired token',
      timestamp: new Date().toISOString()
    });
    return;
  }

  req.user = user;
  next();
};

// Optional middleware - allows both authenticated and unauthenticated access
export const optionalAuth = (req: AuthRequest, res: Response, next: NextFunction): void => {
  const authHeader = req.headers.authorization;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const user = verifyToken(token);
    req.user = user || undefined;
  }

  next();
};

