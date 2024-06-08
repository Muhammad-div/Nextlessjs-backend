import { Router } from 'express';

import { teamController } from '@/controllers';
import {
  bodyCreateTeamValidate,
  bodyInviteValidate,
  bodyTeamNameValidate,
  fullEditMemberValidate,
  fullJoinValidate,
  paramsJoinValidate,
  paramsMemberIdValidate,
  paramsTeamIdValidate,
} from '@/validations/TeamValidation';

const teamRouter = Router();

teamRouter.post('/team/create', bodyCreateTeamValidate, teamController.create);

teamRouter.get(
  '/team/:teamId/list-members',
  paramsTeamIdValidate,
  teamController.listMembers,
);

teamRouter.put(
  '/team/:teamId/name',
  bodyTeamNameValidate,
  teamController.updateDisplayName,
);

teamRouter.delete('/team/:teamId', paramsTeamIdValidate, teamController.delete);

teamRouter.post(
  '/team/:teamId/invite',
  bodyInviteValidate,
  teamController.invite,
);

teamRouter.get(
  '/team/:teamId/join/:verificationCode',
  paramsJoinValidate,
  teamController.getJoinInfo,
);

teamRouter.post(
  '/team/:teamId/join/:verificationCode',
  fullJoinValidate,
  teamController.join,
);

teamRouter.put(
  '/team/:teamId/edit/:memberId',
  fullEditMemberValidate,
  teamController.editMember,
);

teamRouter.delete(
  '/team/:teamId/remove/:memberId',
  paramsMemberIdValidate,
  teamController.removeMember,
);

teamRouter.put(
  '/team/:teamId/transfer-ownership/:memberId',
  paramsMemberIdValidate,
  teamController.transferOwnership,
);

teamRouter.get(
  '/team/:teamId/settings',
  paramsTeamIdValidate,
  teamController.getSettings,
);

export { teamRouter };
