import { Router } from 'express';

import { adminController } from '@/controllers';
import {
  fullEditUserStatusValidate,
  paramsTeamDetailsValidate,
  queryList,
} from '@/validations/AdminValidation';

const adminRouter = Router();

adminRouter.get('/super-admin/stats', adminController.getStats);

adminRouter.get(
  '/super-admin/list-users',
  queryList,
  adminController.listUsers,
);

adminRouter.put(
  '/super-admin/user-status/:username',
  fullEditUserStatusValidate,
  adminController.editUserStatus,
);

adminRouter.get(
  '/super-admin/list-teams',
  queryList,
  adminController.listTeams,
);

adminRouter.get(
  '/super-admin/team/:teamId',
  paramsTeamDetailsValidate,
  adminController.getTeam,
);

export { adminRouter };
