import { UserDto } from './user.dto';

export class UserDetailDto extends UserDto {
  role: { id: number; name: string } | null;
}
