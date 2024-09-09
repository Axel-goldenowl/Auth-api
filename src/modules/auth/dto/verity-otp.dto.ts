import { IsEmail, IsString } from 'class-validator';

export class verifyOtpDTO {
  @IsString()
  @IsEmail()
  email: string;

  @IsString()
  otp: string;
}
