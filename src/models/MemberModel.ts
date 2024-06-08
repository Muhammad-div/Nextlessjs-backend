import type { Member } from '@prisma/client';
import { InvitationStatus, Role } from '@prisma/client';
import { nanoid } from 'nanoid';
import { ulid } from 'ulid';

import { AbstractModel } from './AbstractModel';

export class MemberModel extends AbstractModel<Member> {
  public readonly teamId: string;

  public readonly inviteCodeOrUserId: string;

  private role: Role = Role.READ_ONLY;

  private status: InvitationStatus = InvitationStatus.PENDING;

  private email = '';

  /**
   * Constructor for Member class.
   * @constructor
   * @param teamId - The ID of the team.
   * @param inviteCodeOrUserId - The ID of the user when status is `MemberStatus.ACTIVE` or the invitation code when status is `MemberStatus.PENDING`.
   */
  constructor(teamId: string, inviteCodeOrUserId?: string) {
    super();
    this.teamId = teamId;

    if (inviteCodeOrUserId) {
      this.inviteCodeOrUserId = inviteCodeOrUserId;
    } else {
      // In pending status, we use the inviteCodeOrUserId for verification code
      this.inviteCodeOrUserId = ulid() + nanoid(30);
    }
  }

  getTeamId() {
    return this.teamId;
  }

  setRole(role: Role) {
    this.role = role;
  }

  getRole() {
    return this.role;
  }

  setStatus(status: InvitationStatus) {
    this.status = status;
  }

  getStatus() {
    return this.status;
  }

  setEmail(email: string) {
    this.email = email;
  }

  getEmail() {
    return this.email;
  }

  keys() {
    return {
      teamInviteCodeOrUserId: {
        teamId: this.teamId,
        inviteCodeOrUserId: this.inviteCodeOrUserId,
      },
    };
  }

  toCreateEntity() {
    return {
      ...this.keys().teamInviteCodeOrUserId,
      ...this.toEntity(),
    };
  }

  toEntity() {
    return {
      role: this.role,
      status: this.status,
      email: this.email,
    };
  }

  fromEntity(entity: Member) {
    this.role = Role[entity.role];
    this.status = InvitationStatus[entity.status];
    this.email = entity.email;
  }
}
