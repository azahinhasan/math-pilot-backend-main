import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UseGuards,
  Req,
  Query,
  ParseIntPipe,
} from '@nestjs/common';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateTopicDto } from './dto/create-topic.dto';
import { CreateTopicCommand } from './commands/create-topic.command';
import { DeleteTopicCommand } from './commands/delete-topic.command';
import { GetTopicsByModuleQuery } from './queries/get-topics-by-module.query';
import { ClerkAuthGuard } from 'src/clerk-auth-guard';

@Controller('topics')
@UseGuards(ClerkAuthGuard)
export class TopicsController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  async create(@Body() createDto: CreateTopicDto) {
    const {
      name,
      moduleId,
      serialNumber,
      paperNumber,
      description,
      logoFileName,
    } = createDto;
    return this.commandBus.execute(
      new CreateTopicCommand(
        name,
        moduleId,
        serialNumber,
        paperNumber,
        description,
        logoFileName,
      ),
    );
  }

  @Delete(':id')
  async delete(@Param('id') id: string) {
    return this.commandBus.execute(new DeleteTopicCommand(id));
  }

  @Get('module/:moduleId')
  async getTopicsByModule(
    @Param('moduleId') moduleId: string,
    @Query('paperNumber', new ParseIntPipe({ optional: true }))
    paperNumber: number | undefined,
    @Req() req,
  ) {
    const clerkId = req.user.sub;

    return this.queryBus.execute(
      new GetTopicsByModuleQuery(moduleId, clerkId, paperNumber),
    );
  }
}
