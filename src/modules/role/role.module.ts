import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from '../../prisma/prisma.module';
import { RoleController } from './role.controller';
import { GetRolesHandler } from './queries/handlers/get-roles.handler';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [RoleController],
  providers: [GetRolesHandler],
})
export class RoleModule {}
