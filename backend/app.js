import express from 'express';
import bodyParser from 'body-parser';
import graphqlHttp from 'express-graphql';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import GraphQLSchema from './graphql/schema/index.js';
import isAuth from './middleware/is-auth.js';
import { join } from 'path';
import graphQlResolvers from './graphql/resolvers/index.js';
import getErrorCode from './helpers/errorCode.js';
import cookieParser from 'cookie-parser';
import { errorTypes } from './helpers/errorConstants.js';
import { upload, compressAndSave } from './middleware/upload.js';
import { mkdirSync } from 'fs';

// Load .env
dotenv.config();

// ── Ensure uploads directory exists on startup ────────────────────────
mkdirSync('uploads/complaints', { recursive: true });

// Debug: Check env variables
console.log("ENV CHECK:", {
  user: process.env.MONGO_USER,
  db: process.env.MONGO_DB,
  port: process.env.PORT
});

const app = express();

const PORT = process.env.PORT || 5000;

const corsOptions = {
  credentials: true,
  origin: process.env.UI_URL || 'http://localhost:3000'
};

// ── Middlewares ───────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(cookieParser());
app.use(bodyParser.json());
app.use('/', express.static(join(process.cwd(), 'public')));
app.use('/uploads', express.static(join(process.cwd(), 'uploads')));
app.use(isAuth);

// ── File Upload Route (before GraphQL) ───────────────────────────────
// FIX: added 4-argument error handler so multer/sharp errors are caught
// and returned as JSON instead of crashing silently
app.post(
  '/upload/complaint',
  (req, res, next) => {
    // isAuth already ran globally, but double-check here for safety
    if (!req.isAuth) {
      return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
  },
  upload.array('photos', 3),
  compressAndSave,
  // ── 4-argument = Express error handler (catches multer + sharp errors)
  (err, req, res, next) => {
    console.error('Upload error:', err);
    return res.status(500).json({
      message: 'Photo upload failed',
      error: err.message
    });
  },
  // ── Success handler
  (req, res) => {
    if (!req.uploadedPhotos || req.uploadedPhotos.length === 0) {
      return res.status(500).json({ message: 'Photo upload failed: no photos processed' });
    }
    res.json({ photos: req.uploadedPhotos });
  }
);

// ── GraphQL Route ─────────────────────────────────────────────────────
app.use(
  '/graphql',
  async (req, res, next) => {
    await graphqlHttp({
      schema: GraphQLSchema,
      rootValue: graphQlResolvers,
      graphiql: true,
      formatError: (err) => {
        console.log(err);

        const error = getErrorCode(err.message);

        if (error.message === errorTypes.DEFAULT.message) {
          error['detailedError'] = err;
        }

        res.status(error.statusCode);

        return {
          error,
          message: error.message
        };
      }
    })(req, res, next);
  }
);

// ── MongoDB URL ───────────────────────────────────────────────────────
const MONGO_URI =
  "mongodb://" +
  `${process.env.MONGO_USER}:${process.env.MONGO_PASSWORD}@` +
  "ac-vcainna-shard-00-00.aihq4ld.mongodb.net:27017," +
  "ac-vcainna-shard-00-01.aihq4ld.mongodb.net:27017," +
  "ac-vcainna-shard-00-02.aihq4ld.mongodb.net:27017/" +
  `${process.env.MONGO_DB}` +
  "?ssl=true&authSource=admin&retryWrites=true&w=majority";

// ── Start Server ──────────────────────────────────────────────────────
async function Start_Server() {
  try {
    console.log("Mongo URL:", MONGO_URI);

    await mongoose.connect(MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 10000,
    });

    console.log("✅ MongoDB Connected");

    app.listen(PORT, () => {
      console.log(`🚀 Server running on port: ${PORT}`);
    });

  } catch (err) {
    console.error("❌ MongoDB Connection Error:", err);
  }
}

Start_Server();