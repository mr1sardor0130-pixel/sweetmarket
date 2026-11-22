import type { Request, Response } from 'express';
import { isAllowedGoogleRole, isSameOriginRequest, setGoogleRoleIntent } from '../../lib/auth-role-intent.js';

export async function createGoogleRoleIntent(req: Request, res: Response) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  if (!isSameOriginRequest(req)) {
    res.status(403).json({ error: 'INVALID_ORIGIN' });
    return;
  }

  const body = req.body && typeof req.body === 'object' ? req.body as Record<string, unknown> : {};
  if (!isAllowedGoogleRole(body.role)) {
    res.status(400).json({ error: 'INVALID_ROLE' });
    return;
  }

  setGoogleRoleIntent(res, body.role);
  res.status(204).end();
}

export default createGoogleRoleIntent;
