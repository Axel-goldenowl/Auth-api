import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class UserDto {
  @IsString()
  email: string;

  @IsEmail()
  @IsNotEmpty()
  otp: string;
}
