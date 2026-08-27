import { Injectable } from '@nestjs/common';
import { createTransport, Transporter } from 'nodemailer';
import {
  EmailSenderPort,
  SendCertificateEmailParams,
} from '../../../ports/outbound/email-sender.port';

/** Adaptador outbound: envía correos vía SMTP (Mailpit local o Ethereal/Mailtrap en la nube) con Nodemailer. */
@Injectable()
export class NodemailerEmailSenderAdapter implements EmailSenderPort {
  private readonly transporter: Transporter;

  constructor() {
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASS;
    this.transporter = createTransport({
      host: process.env.SMTP_HOST ?? 'localhost',
      port: Number(process.env.SMTP_PORT ?? 1025),
      secure: false,
      // Mailpit no requiere auth; Ethereal/Mailtrap sí.
      auth: user && pass ? { user, pass } : undefined,
    });
  }

  async sendCertificateEmail(params: SendCertificateEmailParams): Promise<void> {
    await this.transporter.sendMail({
      from: 'CertiChain <no-reply@certichain.local>',
      to: params.to,
      subject: `Tu certificado: ${params.degreeTitle}`,
      text:
        `Hola ${params.holderName},\n\n` +
        `Tu certificado "${params.degreeTitle}" ha sido emitido correctamente.\n` +
        `Puedes verificarlo en: ${params.verificationUrl}\n\n` +
        `Saludos,\nCertiChain`,
      html:
        `<p>Hola ${params.holderName},</p>` +
        `<p>Tu certificado "<strong>${params.degreeTitle}</strong>" ha sido emitido correctamente.</p>` +
        `<p>Puedes verificarlo en: <a href="${params.verificationUrl}">${params.verificationUrl}</a></p>` +
        `<p>Saludos,<br/>CertiChain</p>`,
    });
  }
}
