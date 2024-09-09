import { IsString, IsEmail, IsNotEmpty } from 'class-validator';

export class UserDto {
  @IsString()
  name: string;

  @IsEmail()
  @IsNotEmpty()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}
