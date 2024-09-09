import { Response } from 'express';

import { ConfigService } from '@nestjs/config';
import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  HttpStatus,
} from '@nestjs/common';

import { AuthService } from '@/modules/auth/auth.service';

import { UserDto } from '@/modules/users/dto/create-user.dto';
import { VERIFICATION_EMAIL_SUCCESS_TEMPLATE } from '@/modules/email';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post('register')
  async register(
    @Body() userData: UserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.registerService(userData);

    response.status(result.statusCode).json(result);
  }

  @Get('confirm/:id')
  async confirm(@Res() response: Response, @Param('id') id: string) {
    const result = await this.authService.confirmEmailService(id);
    if (result.statusCode === HttpStatus.ACCEPTED) {
      const url = this.configService.get<string>('CLIENT_URL');
      response
        .status(result.statusCode)
        .send(VERIFICATION_EMAIL_SUCCESS_TEMPLATE.replace('{url}', url));
    } else {
      response.status(result.statusCode).json(result);
    }
  }

  @Post('login')
  async login(
    @Body() userData: UserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.loginService(userData);
    if (result.statusCode === HttpStatus.OK) {
      response.cookie('auth_token', result.token, {
        path: '/',
        expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
        httpOnly: true,
        sameSite: 'lax',
      });
    }
    delete result.token;
    response.status(result.statusCode).json(result);
  }

  @Post('forgot-password')
  async resetPassword(
    @Body('email') email: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.forgotPasswordService(email);
    response.status(result.statusCode).json(result);
  }

  @Post('verify-otp')
  async verifyOTP(
    @Body('email') email: string,
    @Body('otp') otp: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.verifyOTPService(email, otp);

    response.status(result.statusCode).json(result);
  }
}
