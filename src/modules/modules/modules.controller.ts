import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  ParseEnumPipe,
  UseGuards,
  Req,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateModuleDto } from './dto/create-module.dto';
import { CreateModuleCommand } from './commands/create-module.command';
import { DeleteModuleCommand } from './commands/delete-module.command';
import { GetModulesBySubjectQuery } from './queries/get-modules-by-subject.query';
import { Subject } from '@prisma/client';
import { ClerkAuthGuard } from 'src/clerk-auth-guard';

@Controller('modules')
@UseGuards(ClerkAuthGuard)
export class ModulesController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() createDto: CreateModuleDto) {
    const {
      name,
      boardAgeLevelId,
      subject,
      description,
      formulaBookUrl,
      logoFileName,
    } = createDto;
    return this.commandBus.execute(
      new CreateModuleCommand(
        name,
        boardAgeLevelId,
        subject,
        description,
        formulaBookUrl,
        logoFileName,
      ),
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.commandBus.execute(new DeleteModuleCommand(id));
  }

  @Get('subject/:subject')
  async getModulesBySubject(@Param('subject') subject: Subject, @Req() req) {
    const clerkId = req.user.sub;

    return this.queryBus.execute(new GetModulesBySubjectQuery(subject,clerkId));
  }
}

