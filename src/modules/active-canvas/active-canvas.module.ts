import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { PrismaModule } from 'src/prisma/prisma.module';
import { ActiveCanvasController } from './active-canvas.controller';
import { SaveActiveCanvasHandler } from './commands/handlers/save-active-canvas.handler';
import { GetActiveCanvasHandler } from './queries/handlers/get-active-canvas.handler';

@Module({
  imports: [CqrsModule, PrismaModule],
  controllers: [ActiveCanvasController],
  providers: [SaveActiveCanvasHandler, GetActiveCanvasHandler],
})
export class ActiveCanvasModule {}
