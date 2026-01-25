import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ModulesController } from './modules.controller';
import { CreateModuleHandler } from './commands/handlers/create-module.handler';
import { DeleteModuleHandler } from './commands/handlers/delete-module.handler';
import { GetModulesBySubjectHandler } from './queries/handlers/get-modules-by-subject.handler';
import { GetModuleStatisticsHandler } from '../practice-mode/queries/handlers/get-module-statistics.handler';
import { ClerkModule } from 'src/clerk/clerk.module';

@Module({
  imports: [CqrsModule, ConfigModule, PrismaModule, ClerkModule],
  controllers: [ModulesController],
  providers: [
    CreateModuleHandler,
    DeleteModuleHandler,
    GetModulesBySubjectHandler,
    GetModuleStatisticsHandler,
  ],
})
export class ModulesModule {}
