import { Prisma } from '@prisma/client';

import type { AbstractModel } from '@/models/AbstractModel';

// Use this file as a external library
export class AbstractRepository<
  DbClient extends {
    [Key in keyof Prisma.UserDelegate]: any;
  },
  PrismaModel,
  Model extends AbstractModel<PrismaModel>,
> {
  protected dbClient: DbClient;

  constructor(dbClient: DbClient) {
    this.dbClient = dbClient;
  }

  // eslint-disable-next-line class-methods-use-this
  async catchNotFound(execute: () => Promise<any>) {
    let res;

    try {
      res = await execute();
    } catch (ex: any) {
      if (
        !(ex instanceof Prisma.PrismaClientKnownRequestError) ||
        ex.code !== 'P2025' // https://www.prisma.io/docs/reference/api-reference/error-reference#p2025
      ) {
        throw ex;
      }
    }

    return res;
  }

  async create(model: Model) {
    await this.dbClient.create({
      data: model.toCreateEntity(),
    });
  }

  async get(model: Model): Promise<Model | null> {
    const entity: PrismaModel = await this.dbClient.findUnique({
      where: model.keys(),
    });

    if (!entity) {
      return null;
    }

    model.fromEntity(entity);
    return model;
  }

  async update(model: Model) {
    const entity: PrismaModel = await this.catchNotFound(async () => {
      return this.dbClient.update({
        data: model.toEntity(),
        where: model.keys(),
      });
    });

    return entity;
  }

  async save(model: Model) {
    await this.dbClient.upsert({
      create: model.toCreateEntity(),
      update: model.toEntity(),
      where: model.keys(),
    });
  }

  async delete(model: Model) {
    const entity: PrismaModel = await this.catchNotFound(() => {
      return this.dbClient.delete({
        where: model.keys(),
      });
    });

    return entity;
  }
}
