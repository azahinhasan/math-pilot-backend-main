import { Test, TestingModule } from '@nestjs/testing';
import { UsersController } from './users.controller';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { GetUsersQuery } from './queries/get-users.query';
import { RegisterUserCommand } from './commands/register-user.command';

describe('UsersController', () => {
  let controller: UsersController;
  let commandBus: CommandBus;
  let queryBus: QueryBus;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [UsersController],
      providers: [
        {
          provide: CommandBus,
          useValue: { execute: jest.fn() },
        },
        {
          provide: QueryBus,
          useValue: { execute: jest.fn() },
        },
      ],
    }).compile();

    controller = module.get<UsersController>(UsersController);
    commandBus = module.get<CommandBus>(CommandBus);
    queryBus = module.get<QueryBus>(QueryBus);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getUsers', () => {
    it('should execute GetUsersQuery', async () => {
      await controller.getUsers();
      expect(queryBus.execute).toHaveBeenCalledWith(expect.any(GetUsersQuery));
    });
  });

  describe('register', () => {
    it('should execute RegisterUserCommand', async () => {
      const body = {
        email: 'test@test.com',
        name: 'Test',
        role: 'student' as RoleType,
        password: 'ABcd_1234',
      };
      await controller.register(body);
      expect(commandBus.execute).toHaveBeenCalledWith(
        expect.any(RegisterUserCommand),
      );
    });
  });
});
