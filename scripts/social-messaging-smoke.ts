import http from 'node:http';
import https from 'node:https';

const BASE_URL = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:4321';
const HEALTH_PATH = '/api/health';
const READY_TIMEOUT_MS = 20_000;
const READY_INTERVAL_MS = 1_000;

type Session = {
  email: string;
  userId: string;
  authCookie: string;
};

type HttpJsonResponse = {
  status: number;
  headers: Record<string, string | string[] | undefined>;
  json: Record<string, unknown>;
};

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

async function requestJson(
  path: string,
  options: {
    method?: 'GET' | 'POST';
    cookie?: string;
    body?: Record<string, unknown>;
  } = {}
): Promise<HttpJsonResponse> {
  const method = options.method ?? 'GET';
  const url = new URL(path, BASE_URL);
  const payload = options.body ? JSON.stringify(options.body) : null;
  const isHttps = url.protocol === 'https:';
  const transport = isHttps ? https : http;

  const headers: Record<string, string> = {
    Accept: 'application/json',
  };
  if (payload) {
    headers['Content-Type'] = 'application/json';
    headers['Content-Length'] = String(Buffer.byteLength(payload));
  }
  if (options.cookie) {
    headers.Cookie = options.cookie;
  }

  return new Promise((resolve, reject) => {
    const req = transport.request(
      {
        protocol: url.protocol,
        hostname: url.hostname,
        port: url.port ? Number(url.port) : isHttps ? 443 : 80,
        path: `${url.pathname}${url.search}`,
        method,
        headers,
      },
      (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk) => {
          chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        });
        res.on('end', () => {
          const raw = Buffer.concat(chunks).toString('utf8');
          const contentType = String(res.headers['content-type'] ?? '').toLowerCase();
          if (!contentType.includes('application/json')) {
            reject(new Error(`JSON bekleniyordu (${res.statusCode ?? 0}): ${raw.slice(0, 300)}`));
            return;
          }

          let parsed: unknown = {};
          try {
            parsed = raw ? JSON.parse(raw) : {};
          } catch {
            reject(new Error(`JSON parse hatası (${res.statusCode ?? 0}): ${raw.slice(0, 300)}`));
            return;
          }

          resolve({
            status: res.statusCode ?? 0,
            headers: res.headers as Record<string, string | string[] | undefined>,
            json: toRecord(parsed),
          });
        });
      }
    );

    req.on('error', (error) => reject(error));
    if (payload) {
      req.write(payload);
    }
    req.end();
  });
}

function extractCookieValues(response: HttpJsonResponse): string[] {
  const setCookie = response.headers['set-cookie'];
  if (Array.isArray(setCookie)) {
    return setCookie;
  }
  if (typeof setCookie === 'string' && setCookie.trim()) {
    return [setCookie];
  }
  return [];
}

function extractAuthCookie(response: HttpJsonResponse): string {
  for (const cookie of extractCookieValues(response)) {
    const match = cookie.match(/(?:^|,\s*)auth-token=([^;,\s]+)/i);
    if (match?.[1]) {
      return `auth-token=${match[1]}`;
    }
  }

  throw new Error('auth-token cookie bulunamadı');
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

function firstArray(record: Record<string, unknown>, paths: string[][]): unknown[] | null {
  for (const path of paths) {
    const value = getNestedValue(record, path);
    if (Array.isArray(value)) {
      return value;
    }
  }
  return null;
}

async function registerUser(label: string): Promise<Session> {
  const timestamp = Date.now();
  const email = `smoke-${label}-${timestamp}-${Math.floor(Math.random() * 10000)}@example.com`;
  const password = 'SmokeTest123!';
  const fullName = `Smoke ${label}`;

  const response = await requestJson('/api/auth/register', {
    method: 'POST',
    body: {
      email,
      password,
      full_name: fullName,
    },
  });

  if (response.status !== 201) {
    throw new Error(`Kayıt başarısız (${response.status}): ${JSON.stringify(response.json).slice(0, 400)}`);
  }

  const userId = firstString(response.json, [
    ['data', 'user', 'id'],
    ['data', 'data', 'user', 'id'],
    ['data', 'userId'],
    ['data', 'data', 'userId'],
  ]);
  if (!userId) {
    throw new Error(`Kayıt cevabında userId yok: ${JSON.stringify(response.json).slice(0, 400)}`);
  }

  return {
    email,
    userId,
    authCookie: extractAuthCookie(response),
  };
}

async function postWithAuth(
  path: string,
  authCookie: string,
  body: Record<string, unknown>,
  expectedStatuses: number[]
): Promise<Record<string, unknown>> {
  const response = await requestJson(path, {
    method: 'POST',
    cookie: authCookie,
    body,
  });

  if (!expectedStatuses.includes(response.status)) {
    throw new Error(
      `${path} beklenmeyen durum: ${response.status}, cevap: ${JSON.stringify(response.json).slice(0, 500)}`
    );
  }
  return response.json;
}

async function getWithAuth(
  path: string,
  authCookie: string,
  expectedStatus: number
): Promise<Record<string, unknown>> {
  const response = await requestJson(path, {
    cookie: authCookie,
  });
  if (response.status !== expectedStatus) {
    throw new Error(
      `${path} beklenmeyen durum: ${response.status}, cevap: ${JSON.stringify(response.json).slice(0, 500)}`
    );
  }
  return response.json;
}

async function main(): Promise<void> {
  await waitForReady(BASE_URL);
  console.log(`smoke-ready ${BASE_URL}${HEALTH_PATH}`);

  const userA = await registerUser('a');
  const userB = await registerUser('b');
  console.log(`smoke-users ${userA.userId} -> ${userB.userId}`);

  await postWithAuth(
    '/api/social/follows',
    userA.authCookie,
    { user_id_to_follow: userB.userId, action: 'follow' },
    [200, 201]
  );
  console.log('smoke-follow ok');

  const conversationResponse = await postWithAuth(
    '/api/messages',
    userA.authCookie,
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
    userA.authCookie,
    { content: 'Smoke mesajı: Şanlıurfa sosyal akış kontrolü.' },
    [200, 201]
  );
  console.log('smoke-message-send ok');

  const unreadBefore = await getWithAuth('/api/messages/unread-count', userB.authCookie, 200);
  const unreadBeforeCount = firstNumber(unreadBefore, [
    ['data', 'data', 'count'],
    ['data', 'count'],
  ]);
  if (unreadBeforeCount === null || unreadBeforeCount < 1) {
    throw new Error(`Okunmamış mesaj sayısı beklenenden düşük: ${JSON.stringify(unreadBefore).slice(0, 500)}`);
  }
  console.log(`smoke-unread-before ${unreadBeforeCount}`);

  const messages = await getWithAuth(`/api/messages/${conversationId}?limit=10`, userB.authCookie, 200);
  const list = getNestedValue(messages, ['data', 'data']);
  if (!Array.isArray(list) || list.length < 1) {
    throw new Error(`Mesaj listesi boş döndü: ${JSON.stringify(messages).slice(0, 500)}`);
  }
  console.log(`smoke-message-read ok (${list.length})`);

  const unreadAfter = await getWithAuth('/api/messages/unread-count', userB.authCookie, 200);
  const unreadAfterCount = firstNumber(unreadAfter, [
    ['data', 'data', 'count'],
    ['data', 'count'],
  ]);
  if (unreadAfterCount === null) {
    throw new Error(`Okunmamış sayısı okunamadı: ${JSON.stringify(unreadAfter).slice(0, 500)}`);
  }

  console.log(`smoke-unread-after ${unreadAfterCount}`);

  const placesResponse = await requestJson('/api/places?limit=1&offset=0');
  const placesJson = placesResponse.json;
  if (placesResponse.status !== 200) {
    throw new Error(`Mekan listesi alınamadı (${placesResponse.status})`);
  }

  const places = firstArray(placesJson, [['data'], ['data', 'data']]);
  if (!places || places.length === 0) {
    console.log('smoke-place-skip no places found');
    console.log('social-messaging-smoke OK');
    return;
  }

  const firstPlace = toRecord(places[0]);
  const placeId = typeof firstPlace.id === 'string' ? firstPlace.id : null;
  if (!placeId) {
    console.log('smoke-place-skip invalid place id');
    console.log('social-messaging-smoke OK');
    return;
  }
  console.log(`smoke-place ${placeId}`);

  await postWithAuth(`/api/places/${placeId}/follow`, userA.authCookie, {}, [200, 201, 409]);
  console.log('smoke-place-follow ok');

  const reviewContent = `Şanlıurfa smoke yorumu ${Date.now()}: mekan deneyimi başarılı.`;
  await postWithAuth(
    '/api/reviews',
    userA.authCookie,
    {
      placeId,
      rating: 5,
      title: 'Smoke Test Yorumu',
      content: reviewContent,
    },
    [200, 201]
  );
  console.log('smoke-review-create ok');

  const placeReviews = await requestJson(
    `/api/reviews?placeId=${encodeURIComponent(placeId)}&limit=5&offset=0`,
    { cookie: userA.authCookie }
  );
  const reviewsJson = placeReviews.json;
  if (placeReviews.status !== 200) {
    throw new Error(`Mekan yorumları alınamadı (${placeReviews.status})`);
  }

  const reviewList = firstArray(reviewsJson, [['data'], ['data', 'data']]);
  if (!reviewList || reviewList.length < 1) {
    throw new Error('Yorum listesi boş döndü');
  }
  console.log(`smoke-review-read ok (${reviewList.length})`);

  console.log('social-messaging-smoke OK');
}

main().catch((error) => {
  console.error(
    'social-messaging-smoke failed:',
    error instanceof Error ? error.message : String(error)
  );
  process.exit(1);
});
