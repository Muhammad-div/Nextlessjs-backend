import assert from 'assert';

import { TodoModel } from '@/models/TodoModel';
import { dbClient } from '@/utils/DBClient';

import { TodoRepository } from './TodoRepository';

describe('TodoRepository', () => {
  let todoRepository: TodoRepository;

  beforeEach(() => {
    todoRepository = new TodoRepository(dbClient);
  });

  describe('Basic operation', () => {
    it("should return null when the todo don't exist", async () => {
      const todo = await todoRepository.findByKeys(
        'user-123',
        '123123123123123123123123',
      );

      expect(todo).toBeNull();
    });

    it('should create a todo when saving a non-existing one and and be able to get the todo from the database', async () => {
      const teamId = 'team-123';
      const todoId = '123123123123123123123123';
      const savedTodo = new TodoModel(teamId, todoId);
      savedTodo.setTitle('todo-title-123');
      await todoRepository.save(savedTodo);

      const todo = await todoRepository.findByKeys(teamId, todoId);
      assert(todo !== null, "todo shouldn't be null");
      expect(todo.getTitle()).toEqual('todo-title-123');
    });

    it('should create a todo when saving a non-existing one and update when saving again', async () => {
      const teamId = 'team-123';
      const todoId = '123123123123123123123123';
      const savedTodo = new TodoModel(teamId, todoId);
      savedTodo.setTitle('todo-title-123');
      await todoRepository.save(savedTodo);

      savedTodo.setTitle('new-todo-title-123');
      await todoRepository.save(savedTodo);

      const todo = await todoRepository.findByKeys(teamId, todoId);
      assert(todo !== null, "todo shouldn't be null");
      expect(todo.getTitle()).toEqual('new-todo-title-123');
    });

    it("shouldn't be able to delete an non-existing todo", async () => {
      const deleteResult = await todoRepository.deleteByKeys(
        'user-123',
        '123123123123123123123123',
      );

      expect(deleteResult).toBeFalsy();
    });

    it('should create a new team and delete the newly created team', async () => {
      const savedTodo = new TodoModel('team-123', '123123123123123123123123');
      await todoRepository.save(savedTodo);

      const deleteResult = await todoRepository.deleteByKeys(
        savedTodo.ownerId,
        savedTodo.id,
      );
      expect(deleteResult).toBeTruthy();

      const team = await todoRepository.findByKeys(
        savedTodo.ownerId,
        savedTodo.id,
      );
      expect(team).toBeNull();
    });

    it('should return all todos from one user', async () => {
      const teamId = 'team-123';
      const todo1 = new TodoModel(teamId);
      todo1.setTitle('todo-user-1');
      await todoRepository.save(todo1);

      const todo2 = new TodoModel(teamId);
      todo2.setTitle('todo-user-2');
      await todoRepository.save(todo2);

      const todo3 = new TodoModel(teamId);
      todo3.setTitle('todo-user-3');
      await todoRepository.save(todo3);

      const result = await todoRepository.findAllByTeamId(teamId);
      expect(result).toHaveLength(3);

      expect(result[0]).toEqual(todo1);
      expect(result[1]).toEqual(todo2);
      expect(result[2]).toEqual(todo3);
    });

    it('should return all todos from multiple users and complex workflow', async () => {
      const teamId1 = 'user-1';
      const teamId2 = 'user-2';
      const teamId3 = 'user-3';

      // Create 2 todos for User 1
      const todo11 = new TodoModel(teamId1);
      todo11.setTitle('todo-user-1-1');
      await todoRepository.save(todo11);

      const todo12 = new TodoModel(teamId1);
      todo12.setTitle('todo-user-1-2');
      await todoRepository.save(todo12);

      // Create 1 todo for User 2
      const todo21 = new TodoModel(teamId2);
      todo21.setTitle('todo-user-2-1');
      await todoRepository.save(todo21);

      // No todo for User 3 by creating one and remove it
      const todo31 = new TodoModel(teamId3);
      todo31.setTitle('todo-user-3-1');
      await todoRepository.save(todo31);
      await todoRepository.deleteByKeys(teamId3, todo31.id);

      // The order is maintaining because the id is from `ulid` library
      const todoList1 = await todoRepository.findAllByTeamId(teamId1);

      // Verify todos from User 1
      expect(todoList1).toHaveLength(2);
      expect(todoList1[0]).toEqual(todo11);
      expect(todoList1[1]).toEqual(todo12);

      // Verify todo from User 2
      const todoList2 = await todoRepository.findAllByTeamId(teamId2);
      expect(todoList2).toHaveLength(1);
      expect(todoList2[0]).toEqual(todo21);

      // Verify todo from User 3
      const todoList3 = await todoRepository.findAllByTeamId(teamId3);
      expect(todoList3).toHaveLength(0);
    });
  });
});
