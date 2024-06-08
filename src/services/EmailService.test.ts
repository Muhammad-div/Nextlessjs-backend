/* eslint-disable class-methods-use-this */
import { mockSendMail } from '__mocks__/nodemailer';

import { AbstractEmailTemplate } from '@/emails/AbstractEmailTemplate';

import { EmailService } from './EmailService';

class TestEmailTemplate extends AbstractEmailTemplate {
  public buildSubject(): string {
    return `Test email subject`;
  }

  public buildText(): string {
    return `Test email text`;
  }
}

describe('EmailService', () => {
  let emailService: EmailService;

  beforeEach(() => {
    emailService = new EmailService();
  });

  describe('Send email', () => {
    it('should able to send email to the correct email', async () => {
      await emailService.send(new TestEmailTemplate(), 'user@example.com');

      expect(mockSendMail).toHaveBeenCalled();
      expect(mockSendMail).toHaveBeenCalledWith(
        expect.objectContaining({
          to: 'user@example.com',
          subject: 'Test email subject',
          text: 'Test email text',
        }),
      );
    });
  });
});
