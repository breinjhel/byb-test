import { Request, Response } from 'express';
import { tokenService } from '../services/tokenService';
import { fileService } from '../services/fileService';
import { db } from '../models';

export class DownloadController {
  /**
   * Generate a download token and URL for a purchased report
   */
  public async generateDownloadToken(req: Request, res: Response): Promise<void> {
    try {
      const { orderId, userId } = req.body;
      
      // Validate request parameters
      if (!orderId || !userId) {
        res.status(400).json({ error: 'Missing required parameters' });
        return;
      }
      
      // Generate download token
      const token = await tokenService.generateDownloadToken(orderId, userId);
      
      if (!token) {
        res.status(400).json({ error: 'Failed to generate download token' });
        return;
      }
      
      // Generate download URL
      const downloadUrl = tokenService.getDownloadUrl(token);
      
      // Return download URL to client
      res.status(200).json({ downloadUrl });
    } catch (error) {
      console.error('Error generating download token:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
  
  /**
   * Download a PDF report using a token
   */
  public async downloadReport(req: Request, res: Response): Promise<void> {
    try {
      const { token } = req.params;
      const ipAddress = req.ip;
      
      // Validate the token
      const validationResult = await tokenService.validateToken(token, ipAddress);
      
      if (!validationResult.isValid || !validationResult.product) {
        res.status(403).json({ error: validationResult.errorMessage || 'Invalid download request' });
        return;
      }
      
      // Get the user information for watermarking
      const user = await db.findUserById(req.query.userId as string);
      
      // Get the file path for the product
      const filePath = await fileService.getFilePathForProduct(validationResult.product);
      
      if (!filePath) {
        res.status(404).json({ error: 'File not found' });
        return;
      }
      
      // In a real implementation, we would watermark the PDF with user information
      // For this proof of concept, we're skipping that step
      
      // Set headers for PDF download
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader(
        'Content-Disposition', 
        `attachment; filename="${validationResult.product.title}.pdf"`
      );
      
      // Stream the file (in a real implementation)
      // For the POC, we'll just send a mock response
      res.status(200).send('Mock PDF content for ' + validationResult.product.title);
      
      // In a real implementation with actual files, we would do:
      // const fileStream = await fileService.streamFile(filePath);
      // if (fileStream) {
      //   fileStream.pipe(res);
      // } else {
      //   res.status(404).json({ error: 'File not found' });
      // }
    } catch (error) {
      console.log('Error downloading report:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
}

export const downloadController = new DownloadController();