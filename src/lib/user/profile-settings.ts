import { comparePassword, hashPassword } from '../auth';
import { logger } from '../logging';
import { queryOne, update } from '../postgres';

export interface ProfileSettingsUser {
  id: string;
}

export interface UpdateProfileInput {
  fullName?: string | null;
  username?: string | null;
  bio?: string | null;
}

export interface ChangePasswordInput {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}

export async function updateProfileSettings(
  user: ProfileSettingsUser,
  input: UpdateProfileInput,
): Promise<{ success: true; message: string }> {
  const fullName = input.fullName?.trim() || null;
  const username = input.username?.trim() || null;
  const bio = input.bio?.trim() || null;

  if (username && !/^[a-zA-Z0-9_]{3,30}$/.test(username)) {
    throw new Error('Kullanıcı adı 3-30 karakter olmalı ve sadece harf, rakam, alt çizgi içermelidir.');
  }

  await update('users', user.id, {
    full_name: fullName,
    username,
    bio,
  });

  logger.info('Profile settings updated', { userId: user.id });

  return {
    success: true,
    message: 'Profil bilgileriniz güncellendi.',
  };
}

export async function changeAccountPassword(
  user: ProfileSettingsUser,
  input: ChangePasswordInput,
): Promise<{ success: true; message: string }> {
  if (input.newPassword !== input.confirmPassword) {
    throw new Error('Yeni şifreler eşleşmiyor.');
  }

  const dbUser = await queryOne<{ id: string; password_hash: string | null }>(
    'SELECT id, password_hash FROM users WHERE id = $1',
    [user.id],
  );

  if (!dbUser?.password_hash) {
    throw new Error('Mevcut şifre doğrulanamadı.');
  }

  const validPassword = await comparePassword(input.currentPassword, dbUser.password_hash);
  if (!validPassword) {
    throw new Error('Mevcut şifre yanlış.');
  }

  const passwordHash = await hashPassword(input.newPassword);
  await update('users', user.id, {
    password_hash: passwordHash,
  });

  logger.info('Account password changed', { userId: user.id });

  return {
    success: true,
    message: 'Şifreniz güncellendi.',
  };
}
