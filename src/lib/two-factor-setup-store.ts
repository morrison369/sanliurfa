type SetupSecretRecord = {
  secret: string;
  expiresAt: number;
};

const setupSecrets = new Map<string, SetupSecretRecord>();

export function setTwoFactorSetupSecret(userId: string, secret: string, ttlSeconds = 600): void {
  setupSecrets.set(userId, {
    secret,
    expiresAt: Date.now() + ttlSeconds * 1000
  });
}

export function getTwoFactorSetupSecret(userId: string): string | null {
  const record = setupSecrets.get(userId);
  if (!record) return null;

  if (record.expiresAt <= Date.now()) {
    setupSecrets.delete(userId);
    return null;
  }

  return record.secret;
}

export function deleteTwoFactorSetupSecret(userId: string): void {
  setupSecrets.delete(userId);
}
