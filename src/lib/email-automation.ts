/**
 * Email Automation Sequences
 * Trigger-based drip campaigns for user engagement
 */

import { queryOne, queryMany, insert, update } from './postgres';
import { sendEmail } from './email';
import { logger } from './logging';

export type SequenceTriggerType = 'user_signup' | 'subscription_start' | 'inactive_30d' | 'inactive_7d';

export interface EmailSequence {
  id: number;
  name: string;
  triggerType: SequenceTriggerType;
  status: string;
  delayMinutes: number;
  createdAt: string;
}

export interface SequenceStep {
  id: number;
  sequenceId: number;
  stepNumber: number;
  subject: string;
  htmlContent: string;
  delayMinutes: number;
  createdAt: string;
}

export interface SequenceEnrollment {
  id: number;
  userId: string;
  sequenceId: number;
  currentStep: number;
  status: string;
  nextSendAt: string;
  enrolledAt: string;
  completedAt?: string;
}

/**
 * Enroll user in automation sequence
 */
export async function enrollInSequence(userId: string, triggerType: SequenceTriggerType): Promise<boolean> {
  try {
    // Get sequence for trigger type
    const sequence = await queryOne(
      'SELECT id, delay_minutes FROM email_sequences WHERE trigger_type = $1 AND status = $2',
      [triggerType, 'active']
    );

    if (!sequence) {
      logger.warn('No active sequence found', { triggerType });
      return false;
    }

    // Check if user already enrolled
    const existing = await queryOne(
      'SELECT id FROM email_sequence_enrollments WHERE user_id = $1 AND sequence_id = $2',
      [userId, sequence.id]
    );

    if (existing) {
      logger.info('User already enrolled in sequence', { userId, sequenceId: sequence.id });
      return true;
    }

    // Calculate next send time (now + sequence delay)
    const nextSendAt = new Date(Date.now() + (sequence.delay_minutes * 60 * 1000));

    // Enroll user
    const result = await insert('email_sequence_enrollments', {
      user_id: userId,
      sequence_id: sequence.id,
      current_step: 0,
      status: 'active',
      next_send_at: nextSendAt.toISOString(),
      enrolled_at: new Date().toISOString()
    });

    logger.info('User enrolled in sequence', {
      userId,
      sequenceId: sequence.id,
      triggerType,
      nextSendAt
    });

    return !!result;
  } catch (error) {
    logger.error('Enroll in sequence failed', error instanceof Error ? error : new Error(String(error)), {
      userId,
      triggerType
    });
    return false;
  }
}

/**
 * Process sequence queue - send pending sequence emails
 */
export async function processSequenceQueue(): Promise<{ processed: number; failed: number }> {
  try {
    // Get all pending enrollments
    const enrollments = await queryMany(`
      SELECT
        ese.id,
        ese.user_id,
        ese.sequence_id,
        ese.current_step,
        u.email,
        ess.subject,
        ess.html_content,
        ess.delay_minutes,
        es.id as seq_id,
        (SELECT COUNT(*) FROM email_sequence_steps WHERE sequence_id = ese.sequence_id) as total_steps
      FROM email_sequence_enrollments ese
      INNER JOIN users u ON ese.user_id = u.id
      INNER JOIN email_sequences es ON ese.sequence_id = es.id
      INNER JOIN email_sequence_steps ess ON es.id = ess.sequence_id
      WHERE ese.status = 'active'
      AND ese.next_send_at <= NOW()
      AND ess.step_number = ese.current_step
      LIMIT 100
    `);

    let processed = 0;
    let failed = 0;

    for (const enrollment of enrollments) {
      try {
        // Send email
        const success = await sendEmail({
          to: enrollment.email,
          subject: enrollment.subject,
          html: enrollment.html_content
        });

        if (!success) {
          failed++;
          continue;
        }

        // Calculate next send time
        const nextSendAt = new Date(Date.now() + (enrollment.delay_minutes * 60 * 1000));
        const isLastStep = enrollment.current_step >= enrollment.total_steps - 1;

        // Update enrollment
        const updateData: Record<string, any> = {
          current_step: enrollment.current_step + 1,
          next_send_at: nextSendAt.toISOString()
        };

        if (isLastStep) {
          updateData.status = 'completed';
          updateData.completed_at = new Date().toISOString();
        }

        await update('email_sequence_enrollments', { id: enrollment.id }, updateData);

        processed++;

        logger.info('Sequence email sent', {
          enrollmentId: enrollment.id,
          userId: enrollment.user_id,
          step: enrollment.current_step,
          completed: isLastStep
        });
      } catch (error) {
        logger.error('Error processing enrollment', error instanceof Error ? error : new Error(String(error)), {
          enrollmentId: enrollment.id,
          userId: enrollment.user_id
        });
        failed++;
      }
    }

    logger.info('Sequence queue processing completed', { processed, failed });

    return { processed, failed };
  } catch (error) {
    logger.error('Process sequence queue failed', error instanceof Error ? error : new Error(String(error)));
    return { processed: 0, failed: 0 };
  }
}

/**
 * Seed predefined sequences into database
 */
export async function seedDefaultSequences(): Promise<void> {
  try {
    const sequences = [
      {
        name: 'Welcome Sequence',
        trigger_type: 'user_signup',
        status: 'active',
        delay_minutes: 0
      },
      {
        name: 'Premium Onboarding',
        trigger_type: 'subscription_start',
        status: 'active',
        delay_minutes: 0
      },
      {
        name: 'Re-engagement Campaign',
        trigger_type: 'inactive_30d',
        status: 'active',
        delay_minutes: 0
      }
    ];

    for (const seq of sequences) {
      // Check if sequence already exists
      const existing = await queryOne(
        'SELECT id FROM email_sequences WHERE trigger_type = $1',
        [seq.trigger_type]
      );

      if (existing) {
        continue;
      }

      // Create sequence
      const sequenceResult = await insert('email_sequences', seq);

      if (!sequenceResult) {
        logger.warn('Failed to create sequence', { triggerType: seq.trigger_type });
        continue;
      }

      const sequenceId = sequenceResult.id || sequenceResult;

      // Create sequence steps based on type
      if (seq.trigger_type === 'user_signup') {
        await createWelcomeSequenceSteps(sequenceId);
      } else if (seq.trigger_type === 'subscription_start') {
        await createPremiumSequenceSteps(sequenceId);
      } else if (seq.trigger_type === 'inactive_30d') {
        await createReengagementSequenceSteps(sequenceId);
      }

      logger.info('Sequence created', {
        name: seq.name,
        triggerType: seq.trigger_type,
        sequenceId
      });
    }
  } catch (error) {
    logger.error('Seed default sequences failed', error instanceof Error ? error : new Error(String(error)));
  }
}

/**
 * Create welcome sequence steps
 */
async function createWelcomeSequenceSteps(sequenceId: number): Promise<void> {
  const steps = [
    {
      sequence_id: sequenceId,
      step_number: 0,
      subject: 'Şanlıurfa\'ya Hoşgeldin! 🎉',
      html_content: `
        <h1>Hoşgeldin!</h1>
        <p>Şanlıurfa.com topluluğuna hoş geldin.</p>
        <p>Platformumuzda binlerce yerin özelliğini keşfedebilir ve yorumlarını paylaşabilirsin.</p>
      `,
      delay_minutes: 0
    },
    {
      sequence_id: sequenceId,
      step_number: 1,
      subject: 'Şanlıurfa\'nın En İyi Yerlerini Keşfet',
      html_content: `
        <h1>Keşfet</h1>
        <p>Şanlıurfa'nın en popüler yerlerini görmek için liderlik tablosunu ziyaret et.</p>
      `,
      delay_minutes: 3 * 24 * 60 // 3 days
    },
    {
      sequence_id: sequenceId,
      step_number: 2,
      subject: 'Katıl ve Önerileri Paylaş',
      html_content: `
        <h1>Katıl</h1>
        <p>Şanlıurfa'nın kültürüne katkı sağla. Yorum yaz, fotoğraf paylaş ve puanlama yap.</p>
      `,
      delay_minutes: 7 * 24 * 60 // 7 days
    }
  ];

  for (const step of steps) {
    await insert('email_sequence_steps', step);
  }
}

/**
 * Create premium onboarding sequence steps
 */
async function createPremiumSequenceSteps(sequenceId: number): Promise<void> {
  const steps = [
    {
      sequence_id: sequenceId,
      step_number: 0,
      subject: 'Premium Üyeliğe Hoşgeldin! 👑',
      html_content: `
        <h1>Premium Özellikler</h1>
        <p>Premium üyeliğine teşekkürler! Şimdi tüm özel özelliklere erişebilirsin.</p>
      `,
      delay_minutes: 0
    },
    {
      sequence_id: sequenceId,
      step_number: 1,
      subject: 'Premium İpuçları ve Tricks',
      html_content: `
        <h1>Özel İpuçlar</h1>
        <p>Premium üyeleri için gizli özellikler ve ipuçlarını öğren.</p>
      `,
      delay_minutes: 2 * 24 * 60 // 2 days
    }
  ];

  for (const step of steps) {
    await insert('email_sequence_steps', step);
  }
}

/**
 * Create re-engagement sequence steps
 */
async function createReengagementSequenceSteps(sequenceId: number): Promise<void> {
  const steps = [
    {
      sequence_id: sequenceId,
      step_number: 0,
      subject: 'Seni Özledik! Geri Dön 💙',
      html_content: `
        <h1>Seni Özledik</h1>
        <p>Şanlıurfa topluluğu seni özledik. Geri dön ve yeni keşifler yap!</p>
      `,
      delay_minutes: 0
    },
    {
      sequence_id: sequenceId,
      step_number: 1,
      subject: 'Özel İndirim Kodu - Sadece Senin İçin 🎁',
      html_content: `
        <h1>Özel Teklif</h1>
        <p>Geri dönüş için sana özel %20 indirim kodu: COMEBACK20</p>
      `,
      delay_minutes: 5 * 24 * 60 // 5 days
    }
  ];

  for (const step of steps) {
    await insert('email_sequence_steps', step);
  }
}

/**
 * Get sequence by ID
 */
export async function getSequence(sequenceId: number): Promise<EmailSequence | null> {
  try {
    const result = await queryOne(
      'SELECT id, name, trigger_type, status, delay_minutes, created_at FROM email_sequences WHERE id = $1',
      [sequenceId]
    );

    if (!result) {
      return null;
    }

    return {
      id: result.id,
      name: result.name,
      triggerType: result.trigger_type,
      status: result.status,
      delayMinutes: result.delay_minutes,
      createdAt: result.created_at
    };
  } catch (error) {
    logger.error('Get sequence failed', error instanceof Error ? error : new Error(String(error)));
    return null;
  }
}

/**
 * Get sequence steps
 */
export async function getSequenceSteps(sequenceId: number): Promise<SequenceStep[]> {
  try {
    const results = await queryMany(
      'SELECT id, sequence_id, step_number, subject, html_content, delay_minutes, created_at FROM email_sequence_steps WHERE sequence_id = $1 ORDER BY step_number ASC',
      [sequenceId]
    );

    return results.map((r: any) => ({
      id: r.id,
      sequenceId: r.sequence_id,
      stepNumber: r.step_number,
      subject: r.subject,
      htmlContent: r.html_content,
      delayMinutes: r.delay_minutes,
      createdAt: r.created_at
    }));
  } catch (error) {
    logger.error('Get sequence steps failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}

/**
 * Get user enrollments
 */
export async function getUserEnrollments(userId: string): Promise<SequenceEnrollment[]> {
  try {
    const results = await queryMany(
      'SELECT id, user_id, sequence_id, current_step, status, next_send_at, enrolled_at, completed_at FROM email_sequence_enrollments WHERE user_id = $1',
      [userId]
    );

    return results.map((r: any) => ({
      id: r.id,
      userId: r.user_id,
      sequenceId: r.sequence_id,
      currentStep: r.current_step,
      status: r.status,
      nextSendAt: r.next_send_at,
      enrolledAt: r.enrolled_at,
      completedAt: r.completed_at
    }));
  } catch (error) {
    logger.error('Get user enrollments failed', error instanceof Error ? error : new Error(String(error)));
    return [];
  }
}
