import express from 'express';
import { downloadController } from '../controllers/downloadController';
import { downloadTrackerMiddleware } from '../middlewares/auth';

const router = express.Router();

/**
 * Route to generate a download token
 * 
 * POST /api/download-tokens
 * Body: { orderId: string, userId: string }
 * Response: { downloadUrl: string }
 */
router.post('/download-tokens', downloadController.generateDownloadToken);

/**
 * Route to download a report using a token
 * 
 * GET /api/download/:token
 * Response: PDF file stream
 */
router.get('/download/:token', downloadTrackerMiddleware, downloadController.downloadReport);

export default router;