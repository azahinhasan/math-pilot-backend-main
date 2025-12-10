import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserQuery } from '../get-user.query';
import { PrismaService } from '../../../../prisma/prisma.service';
import { HttpException, HttpStatus } from '@nestjs/common';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetUserQuery): Promise<any> {
    const { userId } = query;

    const auth = await this.prisma.auth.findUnique({
      where: { id: userId },
      include: { role: true, student: true, guardian: true },
    });

    if (!auth) {
      throw new HttpException('User not found', HttpStatus.NOT_FOUND);
    }

    return auth;
  }
}

