import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUsersQuery } from '../get-users.query';
import { Inject, Injectable } from '@nestjs/common';
import type { ClerkClient } from '@clerk/backend';
import { CLERK_CLIENT } from 'src/clerk/clerk.provider';

@Injectable()
@QueryHandler(GetUsersQuery)
export class GetUsersHandler implements IQueryHandler<GetUsersQuery> {
  constructor(
    @Inject(CLERK_CLIENT) private readonly clerkClient: ClerkClient,
  ) {}

  /**
   * Fetches a list of users from Clerk.
   * Can be expanded to support pagination and filtering.
   */
  async execute(query: GetUsersQuery) {
    return this.clerkClient.users.getUserList();
  }
}
