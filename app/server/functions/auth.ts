import { getWebRequest } from '@tanstack/start/server';
import { supabaseAdmin } from '../../lib/supabase';

/**
 * Securely resolves and verifies the authenticated user ID from the request cookies.
 * This avoids passing the JWT token manually in every server function payload.
 */
export async function getAuthenticatedUserId(): Promise<string> {
  const req = getWebRequest();
  if (!req) {
    throw new Error('UNAUTHORIZED: Request context is not available.');
  }

  const cookieHeader = req.headers.get('cookie') || '';
  const cookies = Object.fromEntries(
    cookieHeader.split(';').map(c => {
      const parts = c.trim().split('=');
      return [parts[0], parts.slice(1).join('=')];
    })
  );

  const token = cookies['sb-access-token'];
  if (!token) {
    throw new Error('UNAUTHORIZED: Active session token is missing.');
  }

  const { data: { user }, error } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) {
    throw new Error('UNAUTHORIZED: Invalid or expired access token.');
  }

  return user.id;
}
