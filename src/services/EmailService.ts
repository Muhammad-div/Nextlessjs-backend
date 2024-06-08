import type { SESClientConfig } from '@aws-sdk/client-ses';
import * as AWS from '@aws-sdk/client-ses';
import nodemailer from 'nodemailer';

import type { AbstractEmailTemplate } from '@/emails/AbstractEmailTemplate';
import { Env } from '@/utils/Env';

export class EmailService {
  private transporter: nodemailer.Transporter;

  constructor() {
    let sesOptions: SESClientConfig = {};

    if (Env.getValue('IS_OFFLINE', false)) {
      sesOptions = {
        endpoint: 'http://127.0.0.1:8005',
      };
    }

    this.transporter = nodemailer.createTransport({
      SES: { ses: new AWS.SES(sesOptions), aws: AWS },
    });
  }

  send(template: AbstractEmailTemplate, email: string) {
    return this.transporter.sendMail({
      from: {
        name: Env.getValue('SITE_NAME'),
        address: Env.getValue('SENDER_EMAIL_ADDRESS'),
      },
      to: email,
      subject: template.buildSubject(),
      text: template.buildText(),
    });
  }
}
