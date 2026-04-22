const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4321';
const HEALTH_PATH = '/api/health';
const READY_TIMEOUT_MS = 20_000;
const READY_INTERVAL_MS = 1_000;

type Session = {
  email: string;
  userId: string;
  authToken: string;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function extractCookieValues(response: Response): string[] {
  const headersWithSetCookie = response.headers as Headers & { getSetCookie?: () => string[] };
  if (typeof headersWithSetCookie.getSetCookie === 'function') {
    return headersWithSetCookie.getSetCookie();
  }

  const merged = response.headers.get('set-cookie');
  if (!merged) {
    return [];
  }

  return merged
    .split(/,(?=\s*[A-Za-z0-9!#$%&'*+\-.^_`|~]+=)/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function extractAuthToken(response: Response): string {
  for (const cookie of extractCookieValues(response)) {
    const [pair] = cookie.split(';');
    if (!pair) continue;

    const [name, ...rest] = pair.split('=');
    if (name?.trim() !== 'auth-token') continue;

    const value = rest.join('=').trim();
    if (value) return value;
  }

  throw new Error('auth-token cookie bulunamadı');
}

function getJsonContentType(response: Response): string {
  return response.headers.get('content-type') ?? '';
}

async function parseJson(response: Response): Promise<Record<string, unknown>> {
  const contentType = getJsonContentType(response).toLowerCase();
  if (!contentType.includes('application/json')) {
    const raw = await response.text();
    throw new Error(`JSON bekleniyordu (${response.status}): ${raw.slice(0, 300)}`);
  }

  return toRecord(await response.json());
}

async function waitForReady(baseUrl: string): Promise<void> {
  const started = Date.now();
  while (Date.now() - started < READY_TIMEOUT_MS) {
    try {
      const res = await fetch(`${baseUrl}${HEALTH_PATH}`);
      if (res.ok || res.status < 500) {
        return;
      }
    } catch {
      // server not ready yet
    }

    await new Promise((resolve) => setTimeout(resolve, READY_INTERVAL_MS));
  }

  throw new Error(
    `Sunucu hazır değil: ${baseUrl}. Önce "npm run dev" çalıştırın (tek port: 4321).`
  );
}

function getNestedValue(record: Record<string, unknown>, path: string[]): unknown {
  let current: unknown = record;
  for (const key of path) {
    if (!current || typeof current !== 'object') {
      return undefined;
    }
    current = (current as Record<string, unknown>)[key];
  }
  return current;
}

function firstString(record: Record<string, unknown>, paths: string[][]): string | null {
  for (const path of paths) {
    const value = getNestedValue(record, path);
    if (typeof value === 'string' && value.trim()) {
      return value;
    }
  }
  return null;
}

function firstNumber(record: Record<string, unknown>, paths: string[][]): number | null {
  for (const path of paths) {
    const value = getNestedValue(record, path);
    if (typeof value === 'number' && Number.isFinite(value)) {
      return value;
    }
    if (typeof value === 'string' && value.trim() && !Number.isNaN(Number(value))) {
      return Number(value);
    }
  }
  return null;
}

async function registerUser(label: string): Promise<Session> {
  const timestamp = Date.now();
  const email = `smoke-${label}-${timestamp}-${Math.floor(Math.random() * 10000)}@example.com`;
  const password = 'SmokeTest123!';
  const fullName = `Smoke ${label}`;

  const response = await fetch(`${BASE_URL}/api/auth/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      email,
      password,
      full_name: fullName,
    }),
  });

  const json = await parseJson(response);
  if (response.status !== 201) {
    throw new Error(`Kayıt başarısız (${response.status}): ${JSON.stringify(json).slice(0, 400)}`);
  }

  const userId = firstString(json, [
    ['data', 'user', 'id'],
    ['data', 'data', 'user', 'id'],
    ['data', 'userId'],
    ['data', 'data', 'userId'],
  ]);
  if (!userId) {
    throw new Error(`Kayıt cevabında userId yok: ${JSON.stringify(json).slice(0, 400)}`);
  }

  return {
    email,
    userId,
    authToken: extractAuthToken(response),
  };
}

async function postWithAuth(
  path: string,
  authToken: string,
  body: Record<string, unknown>,
  expectedStatuses: number[]
): Promise<Record<string, unknown>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Cookie: `auth-token=${authToken}`,
    },
    body: JSON.stringify(body),
  });

  const json = await parseJson(response);
  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `${path} beklenmeyen durum: ${response.status}, cevap: ${JSON.stringify(json).slice(0, 500)}`
    );
  }
  return json;
}

async function getWithAuth(
  path: string,
  authToken: string,
  expectedStatus: number
): Promise<Record<string, unknown>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    headers: { Cookie: `auth-token=${authToken}` },
  });
  const json = await parseJson(response);
  if (response.status !== expectedStatus) {
    throw new Error(
      `${path} beklenmeyen durum: ${response.status}, cevap: ${JSON.stringify(json).slice(0, 500)}`
    );
  }
  return json;
}

async function main(): Promise<void> {
  await waitForReady(BASE_URL);
  console.log(`smoke-ready ${BASE_URL}${HEALTH_PATH}`);

  const userA = await registerUser('a');
  const userB = await registerUser('b');
  console.log(`smoke-users ${userA.userId} -> ${userB.userId}`);

  await postWithAuth(
    '/api/social/follows',
    userA.authToken,
    { user_id_to_follow: userB.userId, action: 'follow' },
    [200, 201]
  );
  console.log('smoke-follow ok');

  const conversationResponse = await postWithAuth(
    '/api/messages',
    userA.authToken,
    { recipient_id: userB.userId },
    [200, 201]
  );

  const conversationId = firstString(conversationResponse, [
    ['data', 'data', 'id'],
    ['data', 'id'],
  ]);
  if (!conversationId) {
    throw new Error(`Konuşma ID bulunamadı: ${JSON.stringify(conversationResponse).slice(0, 500)}`);
  }
  console.log(`smoke-conversation ${conversationId}`);

  await postWithAuth(
    `/api/messages/${conversationId}`,
    userA.authToken,
    { content: 'Smoke mesajı: Şanlıurfa sosyal akış kontrolü.' },
    [200, 201]
  );
  console.log('smoke-message-send ok');

  const unreadBefore = await getWithAuth('/api/messages/unread-count', userB.authToken, 200);
  const unreadBeforeCount = firstNumber(unreadBefore, [
    ['data', 'data', 'count'],
    ['data', 'count'],
  ]);
  if (unreadBeforeCount === null || unreadBeforeCount < 1) {
    throw new Error(`Okunmamış mesaj sayısı beklenenden düşük: ${JSON.stringify(unreadBefore).slice(0, 500)}`);
  }
  console.log(`smoke-unread-before ${unreadBeforeCount}`);

  const messages = await getWithAuth(`/api/messages/${conversationId}?limit=10`, userB.authToken, 200);
  const list = getNestedValue(messages, ['data', 'data']);
  if (!Array.isArray(list) || list.length < 1) {
    throw new Error(`Mesaj listesi boş döndü: ${JSON.stringify(messages).slice(0, 500)}`);
  }
  console.log(`smoke-message-read ok (${list.length})`);

  const unreadAfter = await getWithAuth('/api/messages/unread-count', userB.authToken, 200);
  const unreadAfterCount = firstNumber(unreadAfter, [
    ['data', 'data', 'count'],
    ['data', 'count'],
  ]);
  if (unreadAfterCount === null) {
    throw new Error(`Okunmamış sayısı okunamadı: ${JSON.stringify(unreadAfter).slice(0, 500)}`);
  }

  console.log(`smoke-unread-after ${unreadAfterCount}`);
  console.log('social-messaging-smoke OK');
}

main().catch((error) => {
  console.error(
    'social-messaging-smoke failed:',
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
