export interface WhatsAppMessageInput {
  to: string;
  templateKey: string;
  variables: Record<string, string>;
}

// Future integration point: plug Twilio/Meta Cloud API provider here.
export class WhatsAppService {
  static async sendTemplateMessage(_input: WhatsAppMessageInput): Promise<void> {
    // Intentionally no-op for now.
  }
}
