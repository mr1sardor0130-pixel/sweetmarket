import type { Request, Response } from 'express';
import { eq } from 'drizzle-orm';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from '../../lib/auth.js';
import { db } from '../../lib/db/index.js';
import { authUsers, marketplaceShops } from '../../lib/db/schema.js';
import { clearGoogleRoleIntent, getGoogleRoleIntent } from '../../lib/auth-role-intent.js';

function redirect(res: Response, path: string) {
  res.statusCode = 303;
  res.setHeader('Location', path);
  res.end();
}

export async function completeSocialSignIn(req: Request, res: Response) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    res.status(405).json({ error: 'METHOD_NOT_ALLOWED' });
    return;
  }

  try {
    const session = await auth.api.getSession({ headers: fromNodeHeaders(req.headers) });
    if (!session?.user) {
      redirect(res, '/sign-in');
      return;
    }

    const requestedRole = getGoogleRoleIntent(req);
    clearGoogleRoleIntent(res);
    if (!requestedRole) {
      redirect(res, '/sign-in');
      return;
    }

    const [user] = await db
      .select({ role: authUsers.role, sellerAccountId: authUsers.sellerAccountId })
      .from(authUsers)
      .where(eq(authUsers.id, session.user.id))
      .limit(1);

    if (!user) {
      redirect(res, '/sign-in');
      return;
    }

    if (user.role !== 'admin') {
      await db
        .update(authUsers)
        .set({ role: requestedRole, updatedAt: new Date() })
        .where(eq(authUsers.id, session.user.id));
    }

    if (user.role === 'admin') {
      redirect(res, '/admin');
      return;
    }

    if (requestedRole === 'seller') {
      const [shop] = user.sellerAccountId ? await db.select({ status: marketplaceShops.status })
        .from(marketplaceShops)
        .where(eq(marketplaceShops.id, user.sellerAccountId))
        .limit(1) : [];
      redirect(res, shop?.status === 'approved' ? '/seller' : '/seller/onboarding');
      return;
    }

    redirect(res, '/profile');
  } catch {
    res.status(500).send('Unable to complete sign-in. Please try again.');
  }
}

export default completeSocialSignIn;
