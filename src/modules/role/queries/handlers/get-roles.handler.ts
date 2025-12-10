import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { PrismaService } from '../../../../prisma/prisma.service';
import { GetRolesQuery } from '../get-roles.query';

@QueryHandler(GetRolesQuery)
export class GetRolesHandler implements IQueryHandler<GetRolesQuery> {
  constructor(private readonly prisma: PrismaService) {}

  async execute(query: GetRolesQuery): Promise<any> {
    const roleNames = ['Student', 'Teacher', 'Guardian'];
    
    return this.prisma.role.findMany({
      where: {
        name: {
          in: roleNames,
        },
      },
    });
  }
}
