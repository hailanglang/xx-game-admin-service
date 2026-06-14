import { UserInfoDto } from './user-info.dto';

export class LoginResponseDto {
  token: string;
  currentUser: UserInfoDto;
}