/**
 * Email Service
 * Stable facade over queue/delivery and verification modules
 */

export {
  queueEmail,
  getPendingEmails,
  markEmailSent,
  markEmailFailed,
  sendEmailViaService,
  sendEmail,
  type SendEmailPayload
} from './email.delivery';
export {
  requestEmailVerification,
  isEmailVerified,
  verifyEmailWithToken,
  type EmailVerificationResult
} from './email.verification';
export {
  getPasswordResetEmailHTML,
  getEmailVerificationHTML,
  getWelcomeEmailHTML,
  getReviewResponseEmailHTML,
  getSubscriptionEmailHTML,
  type EmailTemplate
} from './email.templates';