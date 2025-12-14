import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from 'src/prisma/prisma.module';
import { BoardAgeLevelController } from './board-age-level.controller';
import { CreateBoardAgeLevelHandler } from './commands/handlers/create-board-age-level.handler';
import { UpdateBoardAgeLevelHandler } from './commands/handlers/update-board-age-level.handler';
import { DeleteBoardAgeLevelHandler } from './commands/handlers/delete-board-age-level.handler';
import { GetAgeLevelsHandler } from './queries/handlers/get-age-levels.handler';
import { GetBoardsByAgeLevelHandler } from './queries/handlers/get-boards-by-age-level.handler';

@Module({
  imports: [CqrsModule, ConfigModule, PrismaModule],
  controllers: [BoardAgeLevelController],
  providers: [
    CreateBoardAgeLevelHandler,
    UpdateBoardAgeLevelHandler,
    DeleteBoardAgeLevelHandler,
    GetAgeLevelsHandler,
    GetBoardsByAgeLevelHandler,
  ],
})
export class BoardAgeLevelModule {}
