import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUsersQuery } from '../get-users.query';
import clerkClient from '@clerk/clerk-sdk-node';

@QueryHandler(GetUsersQuery)
export class GetUsersHandler implements IQueryHandler<GetUsersQuery> {
  /**
   * Fetches a list of users from Clerk.
   * Can be expanded to support pagination and filtering.
   */
  async execute(query: GetUsersQuery) {
    return clerkClient.users.getUserList();
  }
}
