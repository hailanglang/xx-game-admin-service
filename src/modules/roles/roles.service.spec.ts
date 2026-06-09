import { Test, TestingModule } from '@nestjs/testing';
import { RolesService } from './roles.service.js';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service.js';
import { ConflictException, NotFoundException, BadRequestException } from '@nestjs/common';
import {jest} from "@jest/globals"


describe('RolesService', () => {
  let service: RolesService;
  const mockPrisma = {
    role: {
      findUnique: jest.fn(),
      findMany: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    rolePermission: {
      deleteMany: jest.fn(),
      createMany: jest.fn(),
    },
  } as any;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RolesService,
        { provide: PrismaAdminService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<RolesService>(RolesService);
  });

  it('should throw ConflictException when creating duplicate role name', async () => {
    mockPrisma.role.findUnique.mockResolvedValue({ id: 1, name: 'admin' });
    await expect(
      service.create({ name: 'admin' }),
    ).rejects.toThrow(ConflictException);
  });

  it('should throw NotFoundException when updating non-existing role', async () => {
    mockPrisma.role.findUnique.mockResolvedValue(null);
    await expect(
      service.update(999, { name: 'test' }),
    ).rejects.toThrow(NotFoundException);
  });

  it('should throw BadRequestException when deleting system role', async () => {
    mockPrisma.role.findUnique.mockResolvedValue({ id: 1, isSystem: true, _count: { users: 0 } });
    await expect(
      service.remove(1),
    ).rejects.toThrow(BadRequestException);
  });
});