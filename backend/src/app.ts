import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import dotenv from 'dotenv';
import path from 'path';

// Routes
import downloadsRouter from './routes/downloads';
import providersRouter from './routes/providers';
import healthRouter from './routes/health';
import activitiesRouter from './routes/activities';
import authRouter from './routes/auth';
import usersRouter from './routes/users';
import apiTokensRouter from './routes/apiTokens';
import notificationsRouter from './routes/notifications';
import directRouter from './routes/direct';
import settingsRouter from './routes/settings';

// Services
import { Database } from './database/database';

// Load environment variables
dotenv.config();

export const createApp = async () => {
  const app = express();

  // Initialize database
  const database = Database.getInstance();
  await database.initialize();

  // Security middleware
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
  }));

  // CORS configuration
  app.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000', 'http://localhost:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With']
  }));

  // Compression
  app.use(compression());

  // Logging
  app.use(morgan('combined'));

  // Body parsing
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Static file serving for frontend
  const frontendPath = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendPath));

  // API Routes
  app.use('/api/auth', authRouter);
  app.use('/api/users', usersRouter);
  app.use('/api/api-tokens', apiTokensRouter);
  app.use('/api/notifications', notificationsRouter);
  app.use('/api/downloads', downloadsRouter);
  app.use('/api/providers', providersRouter);
  app.use('/api/health', healthRouter);
  app.use('/api/activities', activitiesRouter);
  app.use('/api/direct', directRouter);
  app.use('/api/settings', settingsRouter);

  // API Info endpoint
  app.get('/api', (req, res) => {
    res.json({
      name: 'IAM File Server API',
      version: process.env.npm_package_version || '1.0.0',
      description: 'Automated download management system',
      endpoints: {
        health: '/api/health',
        downloads: '/api/downloads',
        providers: '/api/providers'
      },
      timestamp: new Date().toISOString()
    });
  });

  // Health check endpoint (for load balancers)
  app.get('/ping', (req, res) => {
    res.status(200).send('pong');
  });

  // Serve frontend for all non-API routes
  app.get('*', (req, res) => {
    if (!req.path.startsWith('/api')) {
      res.sendFile(path.join(frontendPath, 'index.html'));
    } else {
      res.status(404).json({
        success: false,
        error: 'API endpoint not found',
        timestamp: new Date().toISOString()
      });
    }
  });

  // Global error handler
  app.use((err: Error, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('Global error handler:', err);
    
    res.status(500).json({
      success: false,
      error: process.env.NODE_ENV === 'production' ? 'Internal server error' : err.message,
      timestamp: new Date().toISOString()
    });
  });

  return app;
};

export default createApp;
