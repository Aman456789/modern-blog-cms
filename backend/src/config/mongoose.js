// backend/src/config/mongoose.js
//
// Singleton Mongoose connection pool manager.
//
// In local Node.js development, Nodemon hot-reloads the process on every
// file save. Without caching the connection on the Node `global` object,
// every reload would spin up a brand-new connection pool against MongoDB,
// quickly exhausting available connections. Caching the promise (not just
// the resolved connection) also protects against race conditions when
// multiple modules call dbConnect() concurrently during startup.

import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error('Missing process.env.MONGODB_URI');
}

// Global cache for the connection pool. Survives hot reloads because
// `global` is not reset between Nodemon restarts of the same process tree
// the way module-level variables can be when a file is re-required.
let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null };
}

export async function dbConnect() {
  // Fast path: already connected, reuse it.
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_URI, {
        dbName: 'fotographiya_blog',
        maxPoolSize: 4,
        serverSelectionTimeoutMS: 10000,
        socketTimeoutMS: 15000,
        bufferCommands: false,
      })
      .then((mongooseInstance) => {
        return mongooseInstance;
      })
      .catch((err) => {
        // Reset the cached promise on failure so the next call can retry
        // the connection instead of permanently caching a rejected promise.
        cached.promise = null;
        throw err;
      });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}

export default dbConnect;
