import type { Todo } from '@prisma/client';
import { ObjectId } from 'bson';

import { AbstractModel } from './AbstractModel';

export class TodoModel extends AbstractModel<Todo> {
  public readonly id: string;

  public ownerId: string;

  private title: string = '';

  /**
   * Constructor for Todo class.
   * @constructor
   * @param ownerId - The owner ID of the todo.
   * @param id - The ID of the todo.
   */
  constructor(ownerId: string, id?: string) {
    super();
    this.ownerId = ownerId;

    if (id) {
      this.id = id;
    } else {
      this.id = new ObjectId().toString();
    }
  }

  setTitle(title: string) {
    this.title = title;
  }

  getTitle() {
    return this.title;
  }

  keys() {
    return {
      id: this.id,
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
      ownerId: this.ownerId,
      title: this.title,
    };
  }

  fromEntity(entity: Todo) {
    this.ownerId = entity.ownerId;
    this.title = entity.title;
  }
}
