import { NextResponse } from 'next/server';
import { logger } from '../utils/logger';

export function errorHandler(error: unknown) {
  logger.error('API Error', { error: error instanceof Error ? error.message : 'Unknown' });

  if (error instanceof Error) {
    if (error.message.includes('timeout')) {
      return NextResponse.json(
        { error: 'Service temporarily unavailable' },
        { status: 503 }
      );
    }

    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    );
  }

  return NextResponse.json(
    { error: 'Internal server error' },
    { status: 500 }
  );
}

export function validationError(message: string) {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFoundError(resource: string) {
  return NextResponse.json({ error: `${resource} not found` }, { status: 404 });
}