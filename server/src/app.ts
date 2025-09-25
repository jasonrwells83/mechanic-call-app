import express, { type ErrorRequestHandler, type Request, type Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import apiRoutes from './routes/index';

// Load environment variables
dotenv.config();

// Initialize InstantDB (will validate environment variables)
import './config/instantdb';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
const defaultAllowedOrigins = ['http://localhost:5173', 'http://localhost:5174'];
const envOriginList = process.env.FRONTEND_URLS
  ? process.env.FRONTEND_URLS.split(',').map((origin) => origin.trim()).filter(Boolean)
  : [];
const singleFrontEndOrigin = process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : [];
const allowedOrigins = Array.from(new Set([...envOriginList, ...singleFrontEndOrigin, ...defaultAllowedOrigins]));

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.warn('Blocked CORS origin:', origin);
    return callback(new Error('Not allowed by CORS'));
  },
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({ 
    status: 'OK', 
    message: 'Mechanic Shop OS API is running',
    timestamp: new Date().toISOString()
  });
});

// API routes
app.use('/api', apiRoutes);

// API root endpoint
app.get('/api', (req: Request, res: Response) => {
  res.json({ 
    message: 'Mechanic Shop OS API v1.0',
    endpoints: {
      health: '/health',
      testDb: '/api/test-db',
      jobs: '/api/jobs',
      customers: '/api/customers',
      vehicles: '/api/vehicles',
      calls: '/api/calls',
      appointments: '/api/appointments'
    }
  });
});

// 404 handler - express@5 no longer accepts '*' patterns, so use a catch-all middleware
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Endpoint not found',
    path: req.originalUrl
  });
});

// Error handler
const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  console.error('Error:', err);

  if (res.headersSent) {
    return next(err);
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? (err as Error).message : 'Something went wrong'
  });
};

app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`ðŸš€ Mechanic Shop OS API server running on port ${PORT}`);
  console.log(`ðŸ“‹ Health check: http://localhost:${PORT}/health`);
  console.log(`ðŸ”§ API docs: http://localhost:${PORT}/api`);
});

export default app;
