import { betterAuth } from 'better-auth';
import { genericOAuth } from 'better-auth/plugins';
import { Pool } from 'pg';
import { createRemoteJWKSet, jwtVerify } from 'jose';

const databaseUrl = process.env.DATABASE_URL_UNPOOLED ?? process.env.DATABASE_URL;
if (!databaseUrl) throw new Error('DATABASE_URL is required for authentication');
if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) {
  throw new Error('BETTER_AUTH_SECRET must contain at least 32 characters');
}

export const authPool = new Pool({
  connectionString: databaseUrl,
  options: '-c search_path=sweetmarket_auth,public',
  max: 10,
});

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramBotId = telegramBotToken?.split(':', 1)[0];
const telegramJwks = createRemoteJWKSet(new URL('https://oauth.telegram.org/.well-known/jwks.json'));

const originFor = (value?: string) => {
  if (!value) return [];
  try {
    return [new URL(value.startsWith('http') ? value : `https://${value}`).origin];
  } catch {
    return [];
  }
};

export const authBaseUrl =
  process.env.BETTER_AUTH_URL ??
  (process.env.VERCEL_PROJECT_PRODUCTION_URL
    ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
    : process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : process.env.V0_RUNTIME_URL);

export const auth = betterAuth({
  database: authPool,
  ...(authBaseUrl ? { baseURL: authBaseUrl } : {}),
  emailAndPassword: { enabled: true, autoSignIn: true },
  ...(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
    ? {
        socialProviders: {
          google: {
            clientId: process.env.GOOGLE_CLIENT_ID,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          },
        },
      }
    : {}),
  user: {
    additionalFields: {
      role: { type: 'string', required: false, defaultValue: 'customer', input: false },
      sellerAccountId: { type: 'string', required: false, input: false },
    },
  },
  trustedOrigins: [
    ...(process.env.NODE_ENV === 'development'
      ? [
          'http://localhost:3000',
          ...originFor(process.env.V0_RUNTIME_URL),
          ...originFor(process.env.V0_DEV_APP_URL),
          ...originFor(process.env.V0_BUILD_URL),
          ...originFor(process.env.V0_SANDBOX_URL),
          ...originFor('https://workspace-1eu9a3js.v0.build'),
        ]
      : []),
    ...(process.env.NODE_ENV === 'production'
      ? [
          ...originFor(process.env.VERCEL_URL),
          ...originFor(process.env.VERCEL_PROJECT_PRODUCTION_URL),
          ...originFor('https://sweetmarket-peach.vercel.app'),
        ]
      : []),
  ],
  session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
  ...(telegramBotToken && telegramBotId
    ? {
        plugins: [
          genericOAuth({
            config: [
              {
                providerId: 'telegram',
                name: 'Telegram',
                clientId: telegramBotId,
                clientSecret: telegramBotToken,
                discoveryUrl: 'https://oauth.telegram.org/.well-known/openid-configuration',
                requireIdTokenVerification: true,
                scopes: ['openid', 'profile'],
                pkce: true,
                disableProviderLogout: true,
                getUserInfo: async (tokens) => {
                  if (!tokens.idToken) return null;
                  const { payload } = await jwtVerify(tokens.idToken, telegramJwks, {
                    audience: telegramBotId,
                    issuer: 'https://oauth.telegram.org',
                  });
                  const subject = payload.sub;
                  if (!subject) return null;
                  const firstName = typeof payload.given_name === 'string' ? payload.given_name : '';
                  const lastName = typeof payload.family_name === 'string' ? payload.family_name : '';
                  const name = [firstName, lastName].filter(Boolean).join(' ') || 'Telegram user';
                  return {
                    id: subject,
                    name,
                    email: `${subject}@telegram-user.invalid`,
                    emailVerified: false,
                    image: typeof payload.picture === 'string' ? payload.picture : undefined,
                  };
                },
              },
            ],
          }),
        ],
      }
    : {}),
  ...(process.env.NODE_ENV === 'development'
    ? {
        advanced: {
          defaultCookieAttributes: { sameSite: 'none' as const, secure: true },
        },
      }
    : {}),
});
