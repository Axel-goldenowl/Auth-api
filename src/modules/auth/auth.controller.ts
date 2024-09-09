import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  Res,
  HttpStatus,
  ForbiddenException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { ConfigService } from '@nestjs/config';

import { Response } from 'express';

import { ErrorCode } from '@/common/enums';

import { handleDataResponse } from '@/utils';

import { AuthService } from '@/modules/auth/auth.service';
import { UserDto } from '@/modules/users/dto/create-user.dto';
import { VERIFICATION_EMAIL_SUCCESS_TEMPLATE } from '@/modules/email';

import { verifyOtpDTO } from './dto/verity-otp.dto';
import { Public } from './public.decorator';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly configService: ConfigService,
  ) {}
  @Public()
  @Post('register')
  async register(
    @Body() userData: UserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      await this.authService.registerService(userData);
      response
        .status(HttpStatus.OK)
        .json(
          handleDataResponse(
            'Register successfully! Check and confirm your email',
          ),
        );
    } catch (error) {
      if (error.message === ErrorCode.EMAIL_ALREADY_REGISTERED) {
        throw new ConflictException(ErrorCode.EMAIL_ALREADY_REGISTERED);
      } else {
        throw error;
      }
    }
  }
  @Public()
  @Get('confirm/:id')
  async confirm(
    @Param('id') id: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      await this.authService.confirmEmailService(id);
      const url = this.configService.get<string>('CLIENT_URL');
      response
        .status(HttpStatus.OK)
        .send(VERIFICATION_EMAIL_SUCCESS_TEMPLATE.replace('{url}', url));
    } catch (error) {
      if (error.message === ErrorCode.MISSING_INPUT) {
        throw new NotFoundException(ErrorCode.MISSING_INPUT);
      } else {
        throw error;
      }
    }
  }
  @Public()
  @Post('login')
  async login(
    @Body() userData: UserDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      const token = await this.authService.loginService(userData);
      response
        .cookie('auth_token', token, {
          path: '/',
          expires: new Date(Date.now() + 1000 * 60 * 60),
          httpOnly: true,
          sameSite: 'lax',
        })
        .status(HttpStatus.OK)
        .json(handleDataResponse('Login successfully!'));
    } catch (error) {
      if (error.message === ErrorCode.EMAIL_NO_AUTHENTICATED) {
        throw new ConflictException(ErrorCode.EMAIL_NO_AUTHENTICATED);
      } else if (error.message === ErrorCode.INCORRECT_PASSWORD) {
        throw new ForbiddenException(ErrorCode.INCORRECT_PASSWORD);
      } else {
        throw error;
      }
    }
  }
  @Public()
  @Post('forgot-password')
  async forgotPassword(
    @Body('email') email: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      await this.authService.forgotPasswordService(email);
      response
        .status(HttpStatus.OK)
        .json(
          handleDataResponse('Please check your email to confirm forget', 'OK'),
        );
    } catch (error) {
      if (error.message === ErrorCode.USER_NOT_FOUND) {
        throw new NotFoundException(ErrorCode.USER_NOT_FOUND);
      } else {
        throw error;
      }
    }
  }
  @Public()
  @Post('verify-otp')
  async verifyOTP(
    @Body() otpData: verifyOtpDTO,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      await this.authService.verifyOTPService(otpData);
      response
        .status(HttpStatus.OK)
        .json(handleDataResponse('OTP is verified', 'OK'));
    } catch (error) {
      if (error.message === ErrorCode.OTP_INVALID) {
        throw new ConflictException(ErrorCode.OTP_INVALID);
      } else {
        throw error;
      }
    }
  }
}
