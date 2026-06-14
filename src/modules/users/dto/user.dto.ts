export class UserDto {
  id: number;
  username: string;
  email: string | null;
  avatar: string | null;
  status: boolean;
  roleId: number | null;
  lastLoginAt: Date | null;
  createdAt: Date;
}
