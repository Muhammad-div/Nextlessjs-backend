import { GlobalRole, type User } from '@prisma/client';

import { AbstractModel } from './AbstractModel';

export class UserModel extends AbstractModel<User> {
  public readonly providerId: string;

  private firstSignIn: Date;

  private globalRole: GlobalRole = GlobalRole.CUSTOMER;

  private teamList: string[];

  /**
   * Constructor for User class.
   * @constructor
   * @param id - The ID of the user.
   */
  constructor(providerId: string) {
    super();
    this.providerId = providerId;
    this.firstSignIn = new Date();
    this.teamList = [];
  }

  getFirstSignIn() {
    return this.firstSignIn;
  }

  setFirstSignIn(date: Date) {
    this.firstSignIn = date;
  }

  getGlobalRole() {
    return this.globalRole;
  }

  setGlobalRole(role: GlobalRole) {
    this.globalRole = role;
  }

  getTeamList() {
    return this.teamList;
  }

  addTeam(teamId: string) {
    this.teamList.push(teamId);
  }

  removeTeam(teamId: string) {
    this.teamList = this.teamList.filter((elt) => elt !== teamId);
  }

  keys() {
    return {
      providerId: this.providerId,
    };
  }

  toCreateEntity() {
    return {
      ...this.keys(),
      ...this.toEntity(),
    };
  }

  toEntity() {
    return {
      firstSignIn: this.firstSignIn,
      globalRole: this.globalRole,
      teamList: this.teamList,
    };
  }

  fromEntity(entity: User) {
    this.firstSignIn = entity.firstSignIn;
    this.globalRole = entity.globalRole;
    this.teamList = entity.teamList;
  }
}
