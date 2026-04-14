import { cookies } from 'next/headers';
import { logger } from '../utils/logger';
import type { Session, SpotifyTokens, SpotifyUser } from '../types/auth';

const SESSION_COOKIE_NAME = 'sonic_session';
const SESSION_MAX_AGE = 60 * 60;

class SessionManager {
  private sessions: Map<string, Session> = new Map();

  generateSessionId(): string {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  }

  createSession(tokens: SpotifyTokens, user?: SpotifyUser): Session {
    const sessionId = this.generateSessionId();
    const session: Session = {
      userId: user?.id || sessionId,
      tokens,
      user,
      createdAt: Date.now(),
    };
    
    this.sessions.set(sessionId, session);
    logger.info('Session created', { sessionId: sessionId.substring(0, 10) + '...' });
    
    return session;
  }

  getSession(sessionId: string): Session | null {
    return this.sessions.get(sessionId) || null;
  }

  updateSession(sessionId: string, tokens: SpotifyTokens, user?: SpotifyUser): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.tokens = tokens;
    if (user) session.user = user;
    
    this.sessions.set(sessionId, session);
    return true;
  }

  deleteSession(sessionId: string): boolean {
    return this.sessions.delete(sessionId);
  }

  async setSessionCookie(sessionId: string): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.set(SESSION_COOKIE_NAME, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: SESSION_MAX_AGE,
      path: '/',
    });
  }

  async getSessionIdFromCookie(): Promise<string | null> {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
    return sessionCookie?.value || null;
  }

  async getCurrentSession(): Promise<Session | null> {
    const sessionId = await this.getSessionIdFromCookie();
    if (!sessionId) return null;
    return this.getSession(sessionId);
  }

  async clearSessionCookie(): Promise<void> {
    const cookieStore = await cookies();
    cookieStore.delete(SESSION_COOKIE_NAME);
  }

  isTokenExpired(tokens: SpotifyTokens): boolean {
    return Date.now() >= tokens.expiresAt;
  }

  cleanupExpiredSessions(): void {
    const now = Date.now();
    for (const [sessionId, session] of this.sessions.entries()) {
      if (now >= session.tokens.expiresAt + SESSION_MAX_AGE * 1000) {
        this.sessions.delete(sessionId);
        logger.info('Expired session cleaned up', { sessionId: sessionId.substring(0, 10) + '...' });
      }
    }
  }
}

export const sessionManager = new SessionManager();
