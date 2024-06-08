import type { TeamModel } from '@/models/TeamModel';
import { Env } from '@/utils/Env';

import { AbstractEmailTemplate } from './AbstractEmailTemplate';

export class TeamInviteEmailTemplate extends AbstractEmailTemplate {
  private team: TeamModel;

  private verificationCode: string;

  constructor(team: TeamModel, verificationCode: string) {
    super();
    this.team = team;
    this.verificationCode = verificationCode;
  }

  public buildSubject(): string {
    return `Invite to join ${this.team.getDisplayName()} on ${Env.getValue(
      'SITE_NAME',
    )}`;
  }

  public buildText(): string {
    return `Hi there,\n\nYou've been invited to join ${this.team.getDisplayName()} as a team member on ${Env.getValue(
      'SITE_NAME',
    )}.\n\nAccept invite by clicking the following link:\n${Env.getValue(
      'FRONTEND_DOMAIN_URL',
    )}/join/?teamId=${this.team.id}&verificationCode=${
      this.verificationCode
    }\n\nIf you believe you have received this email by mistake, feel free to ignore it.\n\nThanks for your time.`;
  }
}
