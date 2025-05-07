import { Request, Response } from 'express';
import { downloadController } from '../../src/controllers/downloadController';
import { tokenService } from '../../src/services/tokenService';
import { fileService } from '../../src/services/fileService';
import { db } from '../../src/models';

// Mock dependencies
jest.mock('../../src/services/tokenService', () => ({
  tokenService: {
    generateDownloadToken: jest.fn(),
    validateToken: jest.fn(),
    getDownloadUrl: jest.fn()
  }
}));

jest.mock('../../src/services/fileService', () => ({
  fileService: {
    getFilePathForProduct: jest.fn(),
    streamFile: jest.fn()
  }
}));

jest.mock('../../src/models', () => ({
  db: {
    findUserById: jest.fn()
  }
}));

describe('DownloadController', () => {
  let mockRequest: Partial<Request>;
  let mockResponse: Partial<Response>;
  let jsonMock: jest.Mock;
  let statusMock: jest.Mock;
  
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
    
    // Setup mock response
    jsonMock = jest.fn().mockReturnThis();
    statusMock = jest.fn().mockReturnValue({ json: jsonMock });
    
    mockResponse = {
      status: statusMock,
      json: jsonMock,
      setHeader: jest.fn(),
      send: jest.fn()
    };
  });
  
  describe('generateDownloadToken', () => {
    it('should generate a download token and URL for valid order and user', async () => {
      // Arrange
      const orderId = 'order1';
      const userId = 'user1';
      const mockToken = 'mock-jwt-token';
      const mockDownloadUrl = 'http://example.com/api/download/mock-jwt-token';
      
      mockRequest = {
        body: { orderId, userId }
      };
      
      // Setup mocks
      (tokenService.generateDownloadToken as jest.Mock).mockResolvedValue(mockToken);
      (tokenService.getDownloadUrl as jest.Mock).mockReturnValue(mockDownloadUrl);
      
      // Act
      await downloadController.generateDownloadToken(
        mockRequest as Request, 
        mockResponse as Response
      );
      
      // Assert
      expect(tokenService.generateDownloadToken).toHaveBeenCalledWith(orderId, userId);
      expect(tokenService.getDownloadUrl).toHaveBeenCalledWith(mockToken);
      expect(statusMock).toHaveBeenCalledWith(200);
      expect(jsonMock).toHaveBeenCalledWith({ downloadUrl: mockDownloadUrl });
    });
    
    it('should return 400 error when required parameters are missing', async () => {
      // Arrange
      mockRequest = {
        body: {} // Missing orderId and userId
      };
      
      // Act
      await downloadController.generateDownloadToken(
        mockRequest as Request, 
        mockResponse as Response
      );
      
      // Assert
      expect(tokenService.generateDownloadToken).not.toHaveBeenCalled();
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Missing required parameters' });
    });
    
    it('should return 400 error when token generation fails', async () => {
      // Arrange
      const orderId = 'order1';
      const userId = 'user1';
      
      mockRequest = {
        body: { orderId, userId }
      };
      
      // Setup mocks
      (tokenService.generateDownloadToken as jest.Mock).mockResolvedValue(null);
      
      // Act
      await downloadController.generateDownloadToken(
        mockRequest as Request, 
        mockResponse as Response
      );
      
      // Assert
      expect(tokenService.generateDownloadToken).toHaveBeenCalledWith(orderId, userId);
      expect(statusMock).toHaveBeenCalledWith(400);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Failed to generate download token' });
    });
  });
  
  describe('downloadReport', () => {
    it('should return the PDF file for a valid token', async () => {
      // Arrange
      const token = 'valid-token';
      const userId = 'user1';
      
      mockRequest = {
        params: { token },
        query: { userId },
        ip: '127.0.0.1'
      };
      
      // Mock product
      const mockProduct = {
        id: 'prod1',
        title: 'Test Product',
        resalePrice: 49.99,
        inspectorId: 'insp1',
        privateFileNameOnS3: 'test.pdf'
      };
      
      // Mock user
      const mockUser = {
        id: userId,
        firstName: 'John',
        lastName: 'Doe',
        email: 'john.doe@example.com',
        phoneNumber: '+61412345678'
      };
      
      // Setup mocks
      (tokenService.validateToken as jest.Mock).mockResolvedValue({
        isValid: true,
        product: mockProduct
      });
      (db.findUserById as jest.Mock).mockResolvedValue(mockUser);
      (fileService.getFilePathForProduct as jest.Mock).mockResolvedValue('/mock/path/test.pdf');
      
      // Act
      await downloadController.downloadReport(
        mockRequest as Request, 
        mockResponse as Response
      );
      
      // Assert
      expect(tokenService.validateToken).toHaveBeenCalledWith(token, '127.0.0.1');
      expect(fileService.getFilePathForProduct).toHaveBeenCalledWith(mockProduct);
      expect(mockResponse.setHeader).toHaveBeenCalledWith('Content-Type', 'application/pdf');
      expect(mockResponse.setHeader).toHaveBeenCalledWith(
        'Content-Disposition', 
        `attachment; filename="${mockProduct.title}.pdf"`
      );
      expect(statusMock).toHaveBeenCalledWith(200);
    });
    
    it('should return 403 error for invalid token', async () => {
      // Arrange
      const token = 'invalid-token';
      
      mockRequest = {
        params: { token },
        ip: '127.0.0.1'
      };
      
      // Setup mocks
      (tokenService.validateToken as jest.Mock).mockResolvedValue({
        isValid: false,
        errorMessage: 'Invalid download token'
      });
      
      // Act
      await downloadController.downloadReport(
        mockRequest as Request, 
        mockResponse as Response
      );
      
      // Assert
      expect(tokenService.validateToken).toHaveBeenCalledWith(token, '127.0.0.1');
      expect(statusMock).toHaveBeenCalledWith(403);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'Invalid download token' });
    });
    
    it('should return 404 error when file not found', async () => {
      // Arrange
      const token = 'valid-token';
      
      mockRequest = {
        params: { token },
        query: {},
        ip: '127.0.0.1'
      };
      
      // Mock product
      const mockProduct = {
        id: 'prod1',
        title: 'Test Product',
        resalePrice: 49.99,
        inspectorId: 'insp1',
        privateFileNameOnS3: 'test.pdf'
      };
      
      // Setup mocks
      (tokenService.validateToken as jest.Mock).mockResolvedValue({
        isValid: true,
        product: mockProduct
      });
      (fileService.getFilePathForProduct as jest.Mock).mockResolvedValue(null);
      
      // Act
      await downloadController.downloadReport(
        mockRequest as Request, 
        mockResponse as Response
      );
      
      // Assert
      expect(tokenService.validateToken).toHaveBeenCalledWith(token, '127.0.0.1');
      expect(fileService.getFilePathForProduct).toHaveBeenCalledWith(mockProduct);
      expect(statusMock).toHaveBeenCalledWith(404);
      expect(jsonMock).toHaveBeenCalledWith({ error: 'File not found' });
    });
  });
});