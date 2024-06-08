import { Role } from '@prisma/client';

import { ApiError } from '@/errors/ApiError';
import { ErrorCode } from '@/errors/ErrorCode';
import { TodoModel } from '@/models/TodoModel';
import type { TodoRepository } from '@/repositories/TodoRepository';
import type { TeamService } from '@/services/TeamService';
import type { ParamsTeamIdHandler } from '@/validations/TeamValidation';
import type {
  BodyTodoHandler,
  FullTodoHandler,
  ParamsTodoHandler,
} from '@/validations/TodoValidation';

export class TodoController {
  private teamService: TeamService;

  private todoRepository: TodoRepository;

  constructor(teamService: TeamService, todoRepository: TodoRepository) {
    this.teamService = teamService;
    this.todoRepository = todoRepository;
  }

  public list: ParamsTeamIdHandler = async (req, res) => {
    const { member } = await this.teamService.requiredAuth(
      req.currentUserId,
      req.params.teamId,
    );

    const list = await this.todoRepository.findAllByTeamId(req.params.teamId);

    res.json({
      list: list.map((elt) => ({
        id: elt.id,
        title: elt.getTitle(),
      })),
      role: member.getRole(),
    });
  };

  public create: BodyTodoHandler = async (req, res) => {
    await this.teamService.requiredAuth(req.currentUserId, req.params.teamId, [
      Role.OWNER,
      Role.ADMIN,
    ]);

    const todo = new TodoModel(req.params.teamId);
    todo.setTitle(req.body.title);
    await this.todoRepository.save(todo);

    res.json({
      id: todo.id,
      title: todo.getTitle(),
    });
  };

  public read: ParamsTodoHandler = async (req, res) => {
    await this.teamService.requiredAuth(req.currentUserId, req.params.teamId);

    const todo = await this.todoRepository.findByKeys(
      req.params.teamId,
      req.params.id,
    );

    if (!todo) {
      throw new ApiError('Incorrect TodoId', null, ErrorCode.INCORRECT_TODO_ID);
    }

    res.json({
      id: todo.id,
      title: todo.getTitle(),
    });
  };

  public delete: ParamsTodoHandler = async (req, res) => {
    await this.teamService.requiredAuth(req.currentUserId, req.params.teamId, [
      Role.OWNER,
      Role.ADMIN,
    ]);

    const success = await this.todoRepository.deleteByKeys(
      req.params.teamId,
      req.params.id,
    );

    if (!success) {
      throw new ApiError('Incorrect TodoId', null, ErrorCode.INCORRECT_TODO_ID);
    }

    res.json({
      success: true,
    });
  };

  public update: FullTodoHandler = async (req, res) => {
    await this.teamService.requiredAuth(req.currentUserId, req.params.teamId, [
      Role.OWNER,
      Role.ADMIN,
    ]);

    const todo = new TodoModel(req.params.teamId, req.params.id);
    todo.setTitle(req.body.title);
    const success = await this.todoRepository.update(todo);

    if (!success) {
      throw new ApiError('Incorrect TodoId', null, ErrorCode.INCORRECT_TODO_ID);
    }

    res.json({
      id: todo.id,
      title: todo.getTitle(),
    });
  };
}
