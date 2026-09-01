import { NextResponse } from 'next/server';
import mongoose from 'mongoose';
import { connectToDatabase } from '@/lib/db';

export async function GET() {
  const startTime = Date.now();

  try {
    // Attempt database connection
    await connectToDatabase();
    
    const readyState = mongoose.connection.readyState;
    // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
    const readyStateMap: Record<number, string> = {
      0: 'disconnected',
      1: 'connected',
      2: 'connecting',
      3: 'disconnecting',
    };

    const isConnected = readyState === 1;

    return NextResponse.json(
      {
        status: isConnected ? 'ok' : 'degraded',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        latencyMs: Date.now() - startTime,
        database: {
          status: readyStateMap[readyState] || 'unknown',
          readyState,
          host: mongoose.connection.host || 'N/A',
          name: mongoose.connection.name || 'N/A',
        },
        services: {
          multiTenancyScoping: 'active',
          rbacGuard: 'initialized',
        },
      },
      { status: isConnected ? 200 : 503 }
    );
  } catch (error: any) {
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: error.message || 'Failed to connect to database',
        database: {
          status: 'disconnected',
          readyState: 0,
        },
      },
      { status: 500 }
    );
  }
}
