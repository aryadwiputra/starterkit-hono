import { env } from '../lib/env'

/**
 * EMAIL SERVICE
 * Handles email sending for password reset
 *
 * Current implementation: console logging
 * Production: integrate with SMTP or email service (SendGrid, Resend, etc.)
 */

export interface EmailOptions {
  to: string
  subject: string
  html: string
}

export const emailService = {
  /**
   * Send email
   * Currently logs to console in development
   * In production, configure SMTP or use email service
   */
  send: async (options: EmailOptions): Promise<void> => {
    if (env.NODE_ENV === 'development') {
      // Log email to console in dev
      console.log('\n📧 Email sent:')
      console.log(`   To: ${options.to}`)
      console.log(`   Subject: ${options.subject}`)
      console.log(`   Body:\n${options.html}\n`)
      return
    }

    // Production: send via configured provider
    // Example with SMTP:
    // await smtp.send(options)

    // Example with SendGrid:
    // await sgMail.send({ to: options.to, from: env.EMAIL_FROM, subject: options.subject, html: options.html })

    console.log(`📧 Email would be sent to ${options.to}: ${options.subject}`)
  },

  /**
   * Send password reset email
   */
  sendPasswordReset: async (email: string, token: string, baseUrl: string = 'http://localhost:3000'): Promise<void> => {
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

    const html = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset for your account.</p>
      <p>Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>Or copy this link: ${resetUrl}</p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `

    await emailService.send({
      to: email,
      subject: 'Password Reset - Hono Starter Kit',
      html,
    })
  },
}
