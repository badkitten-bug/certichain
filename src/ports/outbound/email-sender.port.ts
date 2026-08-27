export interface SendCertificateEmailParams {
  to: string;
  holderName: string;
  degreeTitle: string;
  verificationUrl: string;
}

/** Puerto outbound: envío de notificaciones por correo electrónico. */
export interface EmailSenderPort {
  sendCertificateEmail(params: SendCertificateEmailParams): Promise<void>;
}

export const EMAIL_SENDER_PORT = Symbol('EmailSenderPort');
