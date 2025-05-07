import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

/**
 * Interface for authenticated request with user data
 */
export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    email?: string;
  };
}

/**
 * Middleware to validate authentication token (for future use)
 * This would be used for authenticated endpoints in a full implementation
 */
export const authMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  const authRequest = req as AuthenticatedRequest;
  
  try {
    // Get token from Authorization header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      res.status(401).json({ error: 'Authentication required' });
      return;
    }
    
    // Extract token
    const token = authHeader.split(' ')[1];
    
    // In a real implementation, this would verify an authentication token
    // For this proof of concept, we're just simulating the concept
    
    // Mock user data
    authRequest.user = {
      id: 'user1',
      email: 'john.doe@example.com'
    };
    
    next();
  } catch (error) {
    console.error('Authentication error:', error);
    res.status(401).json({ error: 'Authentication failed' });
  }
};

/**
 * Middleware to track download attempts (for analytics and security)
 */
export const downloadTrackerMiddleware = (req: Request, res: Response, next: NextFunction): void => {
  try {
    // Get client IP address
    const ipAddress = req.ip;
    
    // Get download token from params
    const { token } = req.params;
    
    // In a real implementation, this would log download attempts to a database
    // For security monitoring and analytics
    console.log(`Download attempt: token=${token}, ip=${ipAddress}, time=${new Date().toISOString()}`);
    
    next();
  } catch (error) {
    console.error('Error in download tracker middleware:', error);
    next(); // Continue even if tracking fails
  }
};