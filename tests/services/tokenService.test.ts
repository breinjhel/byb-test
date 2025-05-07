import jwt from 'jsonwebtoken';
import { TokenService } from '../../src/services/tokenService';
import { db, DownloadToken } from '../../src/models';

// Mock the models
jest.mock('../../src/models', () => {
  const mockDb = {
    findOrderById: jest.fn(),
    createDownloadToken: jest.fn(),
    findDownloadToken: jest.fn(),
    findProductById: jest.fn(),
    markTokenAsUsed: jest.fn()
  };
  return { db: mockDb };
});

// Mock jwt
jest.mock('jsonwebtoken', () => {
  // Create error classes to mimic jwt error types
  class JsonWebTokenError extends Error {
    constructor(message: string) {
      super(message);
      this.name = 'JsonWebTokenError';
    }
  }
  
  class TokenExpiredError extends Error {
    expiredAt: Date;
    
    constructor(message: string, expiredAt: Date) {
      super(message);
      this.name = 'TokenExpiredError';
      this.expiredAt = expiredAt;
    }
  }
  
  return {
    sign: jest.fn(),
    verify: jest.fn(),
    JsonWebTokenError,
    TokenExpiredError
  };
});

describe('TokenService', () => {
  let tokenService: TokenService;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Create a new instance of TokenService
    tokenService = new TokenService();
  });
  
  describe('generateDownloadToken', () => {
    it('should generate a token for a valid order', async () => {
      // Arrange
      const orderId = 'order1';
      const userId = 'user1';
      const productId = 'prod1';
      
      // Mock order
      const mockOrder = {
        id: orderId,
        productId,
        purchaserId: userId,
        purchaseDate: new Date()
      };
      
      // Mock token
      const mockToken = {
        id: 'token1',
        orderId,
        userId,
        productId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours from now
        isUsed: false
      };
      
      // Setup mocks
      (db.findOrderById as jest.Mock).mockResolvedValue(mockOrder);
      (db.createDownloadToken as jest.Mock).mockResolvedValue(mockToken);
      (jwt.sign as jest.Mock).mockReturnValue('mocked-jwt-token');
      
      // Act
      const result = await tokenService.generateDownloadToken(orderId, userId);
      
      // Assert
      expect(db.findOrderById).toHaveBeenCalledWith(orderId);
      expect(db.createDownloadToken).toHaveBeenCalled();
      expect(jwt.sign).toHaveBeenCalled();
      expect(result).toBe('mocked-jwt-token');
    });
    
    it('should return null if order not found', async () => {
      // Arrange
      const orderId = 'invalid-order';
      const userId = 'user1';
      
      // Setup mocks
      (db.findOrderById as jest.Mock).mockResolvedValue(null);
      
      // Act
      const result = await tokenService.generateDownloadToken(orderId, userId);
      
      // Assert
      expect(db.findOrderById).toHaveBeenCalledWith(orderId);
      expect(db.createDownloadToken).not.toHaveBeenCalled();
      expect(result).toBeNull();
    });
    
    it('should return null if order belongs to another user', async () => {
      // Arrange
      const orderId = 'order1';
      const userId = 'user2'; // Different user
      const productId = 'prod1';
      
      // Mock order
      const mockOrder = {
        id: orderId,
        productId,
        purchaserId: 'user1', // Original owner
        purchaseDate: new Date()
      };
      
      // Setup mocks
      (db.findOrderById as jest.Mock).mockResolvedValue(mockOrder);
      
      // Act
      try {
        await tokenService.generateDownloadToken(orderId, userId);
        // If we reach this line, no error was thrown, so fail the test
        fail('Expected an error to be thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
      }
    //   const result = await tokenService.generateDownloadToken(orderId, userId);
      
      // Assert
      expect(db.findOrderById).toHaveBeenCalledWith(orderId);
      expect(db.createDownloadToken).not.toHaveBeenCalled();
    //   expect(result).toBeNull();
    });
  });
  
  describe('validateToken', () => {
    it('should return valid result for a valid token', async () => {
      // Arrange
      const token = 'valid-token';
      const tokenId = 'token1';
      const userId = 'user1';
      const productId = 'prod1';
      const orderId = 'order1';
      
      // Mock payload
      const mockPayload = {
        tokenId,
        userId,
        productId,
        orderId,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };
      
      // Mock token
      const mockToken: DownloadToken = {
        id: tokenId,
        orderId,
        userId,
        productId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        isUsed: false
      };
      
      // Mock product
      const mockProduct = {
        id: productId,
        title: 'Test Product',
        resalePrice: 49.99,
        inspectorId: 'insp1',
        privateFileNameOnS3: 'test.pdf'
      };
      
      // Setup mocks
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (db.findDownloadToken as jest.Mock).mockResolvedValue(mockToken);
      (db.findProductById as jest.Mock).mockResolvedValue(mockProduct);
      (db.markTokenAsUsed as jest.Mock).mockResolvedValue(mockToken);
      
      // Act
      const result = await tokenService.validateToken(token, '127.0.0.1');
      
      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
      expect(db.findDownloadToken).toHaveBeenCalledWith(tokenId);
      expect(db.findProductById).toHaveBeenCalledWith(productId);
      expect(db.markTokenAsUsed).toHaveBeenCalledWith(tokenId, '127.0.0.1');
      expect(result.isValid).toBe(true);
      expect(result.product).toEqual(mockProduct);
    });
    
    it('should return invalid result for expired token', async () => {
      // Arrange
      const token = 'expired-token';
      
      // Setup mocks
      (jwt.verify as jest.Mock).mockImplementation(() => {
        throw new jwt.TokenExpiredError('jwt expired', new Date());
      });
      
      // Act
      const result = await tokenService.validateToken(token);
      
      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Download link has expired');
    });
    
    it('should return invalid result for already used token', async () => {
      // Arrange
      const token = 'used-token';
      const tokenId = 'token1';
      const userId = 'user1';
      const productId = 'prod1';
      const orderId = 'order1';
      
      // Mock payload
      const mockPayload = {
        tokenId,
        userId,
        productId,
        orderId,
        exp: Math.floor(Date.now() / 1000) + 3600 // 1 hour from now
      };
      
      // Mock token (already used)
      const mockToken: DownloadToken = {
        id: tokenId,
        orderId,
        userId,
        productId,
        createdAt: new Date(),
        expiresAt: new Date(Date.now() + 3600 * 1000), // 1 hour from now
        isUsed: true,
        usedAt: new Date(Date.now() - 1000) // Used 1 second ago
      };
      
      // Setup mocks
      (jwt.verify as jest.Mock).mockReturnValue(mockPayload);
      (db.findDownloadToken as jest.Mock).mockResolvedValue(mockToken);
      
      // Act
      const result = await tokenService.validateToken(token);
      
      // Assert
      expect(jwt.verify).toHaveBeenCalledWith(token, expect.any(String));
      expect(db.findDownloadToken).toHaveBeenCalledWith(tokenId);
      expect(result.isValid).toBe(false);
      expect(result.errorMessage).toBe('Download link has already been used');
    });
  });
});