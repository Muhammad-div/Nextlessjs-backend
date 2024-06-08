import { Router } from 'express';

import { todoController } from '@/controllers';
import { paramsTeamIdValidate } from '@/validations/TeamValidation';
import {
  bodyTodoValidate,
  fullTodoValidate,
  paramsTodoValidate,
} from '@/validations/TodoValidation';

const todoRouter = Router();

todoRouter.get('/:teamId/todo/list', paramsTeamIdValidate, todoController.list);

todoRouter.post(
  '/:teamId/todo/create',
  bodyTodoValidate,
  todoController.create,
);

todoRouter.get('/:teamId/todo/:id', paramsTodoValidate, todoController.read);

todoRouter.delete(
  '/:teamId/todo/:id',
  paramsTodoValidate,
  todoController.delete,
);

todoRouter.put('/:teamId/todo/:id', fullTodoValidate, todoController.update);

export { todoRouter };
