import { Test, TestingModule } from '@nestjs/testing';
import { PrismaAdminService } from './prisma-admin.service';

describe('PrismaAdminService', () => {
  let service: PrismaAdminService;

  beforeAll(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PrismaAdminService],
    }).compile();

    service = module.get<PrismaAdminService>(PrismaAdminService);
  });

  afterAll(async () => {
    await service.$disconnect();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});