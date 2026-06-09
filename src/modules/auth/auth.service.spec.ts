import { Test, TestingModule } from '@nestjs/testing';
import { AuthService } from './auth.service';
import { PrismaAdminService } from '../../lib/prisma/admin/prisma-admin.service';
import { JwtService } from '@nestjs/jwt';
import { UnauthorizedException } from '@nestjs/common';
import * as bcrypt from 'bcrypt';
import { jest } from '@jest/globals';

describe('AuthService', () => {
  let authService: AuthService;
  let prismaAdmin: Partial<PrismaAdminService>;

  const mockAdminUser = {
    id: 1,
    username: 'admin',
    password: bcrypt.hashSync('admin123', 10),
    email: 'admin@xxgame.com',
    avatar: null,
    status: true,
    roleId: 1,
    lastLoginAt: null,
    role: {
      id: 1,
      name: '超级管理员',
      permissions: [
        { permission: { code: 'article:create' } },
        { permission: { code: 'article:read' } },
      ],
    },
  };

  beforeEach(async () => {
    prismaAdmin = {
      adminUser: {
        findUnique: jest.fn().mockResolvedValue(mockAdminUser),
        update: jest.fn().mockResolvedValue(mockAdminUser),
      } as any,
      operationLog: {
        create: jest.fn().mockResolvedValue({}),
      } as any,
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuthService,
        {
          provide: PrismaAdminService,
          useValue: prismaAdmin,
        },
        {
          provide: JwtService,
          useValue: {
            sign: jest.fn().mockReturnValue('mock-token'),
          },
        },
      ],
    }).compile();

    authService = module.get<AuthService>(AuthService);
  });

  it('should login successfully with correct credentials', async () => {
    const result = await authService.login({
      username: 'admin',
      password: 'admin123',
    });

    expect(result.token).toBe('mock-token');
    expect(result.currentUser.username).toBe('admin');
    expect(result.currentUser.permissions).toContain('article:create');
  });

  it('should throw UnauthorizedException with wrong password', async () => {
    await expect(
      authService.login({ username: 'admin', password: 'wrong' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});