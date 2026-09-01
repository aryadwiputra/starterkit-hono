import { env } from '../lib/env'

/**
 * EMAIL SERVICE
 * Penjelasan: Handle email sending untuk password reset
 *
 * Implementasi saat ini: console logging
 * Production: integrasikan dengan SMTP atau email service (SendGrid, Resend, etc.)
 */

export interface EmailOptions {
  to: string
  subject: string
  html: string
}

export const emailService = {
  /**
   * Kirim email
   * Saat ini log ke console di development
   * Di production, konfigurasi SMTP atau gunakan email service
   */
  send: async (options: EmailOptions): Promise<void> => {
    if (env.NODE_ENV === 'development') {
      // Log email ke console di dev
      console.log('\n📧 Email dikirim:')
      console.log(`   Ke: ${options.to}`)
      console.log(`   Subjek: ${options.subject}`)
      console.log(`   Isi:\n${options.html}\n`)
      return
    }

    // Production: kirim via provider yang dikonfigurasi
    // Contoh dengan SMTP:
    // await smtp.send(options)

    // Contoh dengan SendGrid:
    // await sgMail.send({ to: options.to, from: env.EMAIL_FROM, subject: options.subject, html: options.html })

    console.log(`📧 Email akan dikirim ke ${options.to}: ${options.subject}`)
  },

  /**
   * Kirim email reset password
   */
  sendPasswordReset: async (email: string, token: string, baseUrl: string = 'http://localhost:3000'): Promise<void> => {
    const resetUrl = `${baseUrl}/auth/reset-password?token=${token}`

    const html = `
      <h2>Permintaan Reset Password</h2>
      <p>Anda meminta reset password untuk akun Anda.</p>
      <p>Klik link di bawah untuk reset password:</p>
      <a href="${resetUrl}" style="display: inline-block; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Reset Password</a>
      <p>Atau salin link ini: ${resetUrl}</p>
      <p>Link ini berlaku 1 jam.</p>
      <p>Jika Anda tidak meminta ini, abaikan email ini.</p>
    `

    await emailService.send({
      to: email,
      subject: 'Reset Password - Hono Starter Kit',
      html,
    })
  },
}
