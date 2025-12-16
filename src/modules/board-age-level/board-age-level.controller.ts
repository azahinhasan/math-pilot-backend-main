import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateBoardAgeLevelDto } from './dto/create-board-age-level.dto';
import { UpdateBoardAgeLevelDto } from './dto/update-board-age-level.dto';
import { CreateBoardAgeLevelCommand } from './commands/create-board-age-level.command';
import { UpdateBoardAgeLevelCommand } from './commands/update-board-age-level.command';
import { DeleteBoardAgeLevelCommand } from './commands/delete-board-age-level.command';
import { GetAgeLevelsQuery } from './queries/get-age-levels.query';
import { GetBoardsByAgeLevelQuery } from './queries/get-boards-by-age-level.query';
import { AgeLevelName } from '@prisma/client';

@Controller('board-age-level')
export class BoardAgeLevelController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() createDto: CreateBoardAgeLevelDto) {
    const { boardName, ageLevelName } = createDto;
    return this.commandBus.execute(
      new CreateBoardAgeLevelCommand(boardName, ageLevelName),
    );
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateBoardAgeLevelDto,
  ) {
    const { boardName, ageLevelName } = updateDto;
    return this.commandBus.execute(
      new UpdateBoardAgeLevelCommand(id, boardName, ageLevelName),
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.commandBus.execute(new DeleteBoardAgeLevelCommand(id));
  }

  @Get('age-levels')
  async getAgeLevels() {
    return this.queryBus.execute(new GetAgeLevelsQuery());
  }

  @Get('boards/:ageLevel')
  async getBoardsByAgeLevel(@Param('ageLevel') ageLevelName: AgeLevelName) {
    return this.queryBus.execute(new GetBoardsByAgeLevelQuery(ageLevelName));
  }
}
