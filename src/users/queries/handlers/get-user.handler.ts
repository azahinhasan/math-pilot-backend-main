import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUserQuery } from '../get-user.query';
import clerkClient from '@clerk/clerk-sdk-node';
import { InternalServerErrorException } from '@nestjs/common';

@QueryHandler(GetUserQuery)
export class GetUserHandler implements IQueryHandler<GetUserQuery> {
  async execute(query: GetUserQuery) {
    const { userId } = query;
    try {
      const user = await clerkClient.users.getUser(userId);
      return {
        id: user.id,
        email: user.emailAddresses[0]?.emailAddress,
        name: `${user.firstName || ''} ${user.lastName || ''}`.trim(),
        role: user.publicMetadata.role,
        clerkUser: user,
      };
    } catch (error) {
      throw new InternalServerErrorException(
        `Failed to fetch user details: ${error.message}`,
      );
    }
  }
}
