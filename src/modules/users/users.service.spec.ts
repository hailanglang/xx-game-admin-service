import { Test, TestingModule } from '@nestjs/testing';
import { UsersService } from './users.service';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service';
import { ConflictException, NotFoundException } from '@nestjs/common';
import {jest} from "@jest/globals"

describe('UsersService', () => {
  let service: UsersService;

  const mockPrisma = {
    adminUser: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        UsersService,
        { provide: PrismaAdminService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<UsersService>(UsersService);
  });

  it('should throw ConflictException when creating duplicate username', async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValue({ id: 1, username: 'existing' });
    await expect(
      service.create({ username: 'existing', password: '123456' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException when updating non-existing user', async () => {
    mockPrisma.adminUser.findUnique.mockResolvedValue(null);
    await expect(
      service.update(999, { email: 'test@test.com' }),
    ).rejects.toThrow(NotFoundException);
  });
});