import jwt from 'jsonwebtoken';
import { db, DownloadToken, Order, Product } from '../models';

// Token payload interface
interface TokenPayload {
  tokenId: string;
  userId: string;
  productId: string;
  orderId: string;
  exp: number;
}

export class TokenService {
  private readonly JWT_SECRET: string;
  private readonly TOKEN_EXPIRY_HOURS: number;
  
  constructor() {
    // In a real implementation, these would come from environment variables
    this.JWT_SECRET = process.env.JWT_SECRET || 'byb-secure-download-secret-key';
    this.TOKEN_EXPIRY_HOURS = parseInt(process.env.TOKEN_EXPIRY_HOURS || '24', 10);
  }

  /**
   * Generate a new download token for a purchased report
   */
  public async generateDownloadToken(orderId: string, userId: string): Promise<string | null> {
    try {
      // Validate order exists and belongs to user
      const order = await db.findOrderById(orderId);
      if (!order || order.purchaserId !== userId) {
        throw new Error('Invalid order or user');
      }

      // Calculate expiration date
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + this.TOKEN_EXPIRY_HOURS);

      // Create token in database
      const downloadToken = await db.createDownloadToken({
        orderId,
        userId,
        productId: order.productId,
        createdAt: new Date(),
        expiresAt,
        isUsed: false
      });

      // Create JWT
      const payload: TokenPayload = {
        tokenId: downloadToken.id,
        userId,
        productId: order.productId,
        orderId,
        exp: Math.floor(expiresAt.getTime() / 1000)
      };

      return jwt.sign(payload, this.JWT_SECRET);
    } catch (error) {
      console.log('Error generating download token:', error);
      return null;
    }
  }

  /**
   * Validate a download token and return associated data if valid
   */
  public async validateToken(
    token: string, 
    ipAddress?: string
  ): Promise<{ 
    isValid: boolean; 
    product?: Product; 
    errorMessage?: string 
  }> {
    try {
      // Verify JWT signature and expiration
      const payload = jwt.verify(token, this.JWT_SECRET) as TokenPayload;
      
      // Get token from database
      const downloadToken = await db.findDownloadToken(payload.tokenId);
      
      // Check if token exists
      if (!downloadToken) {
        return { isValid: false, errorMessage: 'Invalid download token' };
      }
      
      // Check if token has expired
      if (new Date() > downloadToken.expiresAt) {
        return { isValid: false, errorMessage: 'Download link has expired' };
      }
      
      // Check if token has already been used
      if (downloadToken.isUsed) {
        return { isValid: false, errorMessage: 'Download link has already been used' };
      }
      
      // Get product information
      const product = await db.findProductById(payload.productId);
      if (!product) {
        return { isValid: false, errorMessage: 'Product not found' };
      }
      
      // Mark token as used
      await db.markTokenAsUsed(downloadToken.id, ipAddress);
      
      return { isValid: true, product };
    } catch (error) {
      if (error instanceof Error) {
        // Handle JWT errors
        if (error.name === 'JsonWebTokenError') {
          return { isValid: false, errorMessage: 'Invalid download token' };
        } else if (error.name === 'TokenExpiredError') {
          return { isValid: false, errorMessage: 'Download link has expired' };
        }
      }
      
      console.error('Error validating token:', error);
      return { isValid: false, errorMessage: 'Error processing download request' };
    }
  }
  
  /**
   * Generate a download URL with the token
   */
  public getDownloadUrl(token: string): string {
    // In a real implementation, this would use configured base URL
    const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
    return `${baseUrl}/api/download/${token}`;
  }
}

export const tokenService = new TokenService();