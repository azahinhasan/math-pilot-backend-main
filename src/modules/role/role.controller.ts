import { Controller, Get } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { GetRolesQuery } from './queries/get-roles.query';

@Controller('roles')
export class RoleController {
  constructor(private readonly queryBus: QueryBus) {}

  @Get()
  async getRoles() {
    return this.queryBus.execute(new GetRolesQuery());
  }
}
