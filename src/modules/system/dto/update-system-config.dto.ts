import { IsOptional, IsObject, IsString, IsBoolean } from 'class-validator';

export class UpdateSystemConfigDto {
  @IsOptional()
  @IsObject()
  value?: Record<string, unknown>;

  @IsOptional()
  @IsString()
  description?: string;

  @IsOptional()
  @IsBoolean()
  isEncrypted?: boolean;
}