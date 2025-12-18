import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { TopicsController } from './topics.controller';
import { CreateTopicHandler } from './commands/handlers/create-topic.handler';
import { DeleteTopicHandler } from './commands/handlers/delete-topic.handler';
import { GetTopicsByModuleHandler } from './queries/handlers/get-topics-by-module.handler';

@Module({
  imports: [CqrsModule, ConfigModule, PrismaModule],
  controllers: [TopicsController],
  providers: [
    CreateTopicHandler,
    DeleteTopicHandler,
    GetTopicsByModuleHandler,
  ],
})
export class TopicsModule {}
