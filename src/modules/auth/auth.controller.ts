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
import { ErrorCode } from '@/common/enums';

import { AuthService } from '@/modules/auth/auth.service';

import { UserDto } from '@/modules/users/dto/create-user.dto';
import { VERIFICATION_EMAIL_SUCCESS_TEMPLATE } from '@/modules/email';
import { handleDataResponse } from '@/utils';

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
        response
          .status(HttpStatus.CONFLICT)
          .json(
            handleDataResponse(
              'Email has already registered!',
              ErrorCode.EMAIL_ALREADY_REGISTERED,
            ),
          );
      } else {
        response
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json(
            handleDataResponse(
              'Register failed! ' + error.message,
              ErrorCode.REGISTRATION_FAILED,
            ),
          );
      }
    }
  }

  @Get('confirm/:id')
  async confirm(@Res() response: Response, @Param('id') id: string) {
    try {
      await this.authService.confirmEmailService(id);
      const url = this.configService.get<string>('CLIENT_URL');
      response
        .status(HttpStatus.OK)
        .send(VERIFICATION_EMAIL_SUCCESS_TEMPLATE.replace('{url}', url));
    } catch (error) {
      if (error.message === ErrorCode.MISSING_INPUT) {
        response
          .status(HttpStatus.NOT_ACCEPTABLE)
          .json(handleDataResponse('Missing input', ErrorCode.MISSING_INPUT));
      } else {
        response
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json(
            handleDataResponse(
              'Invalid confirmation link! ' + error.message,
              ErrorCode.INVALID_LINK_EMAIL_VERIFICATION,
            ),
          );
      }
    }
  }

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
        response
          .status(HttpStatus.CONFLICT)
          .json(
            handleDataResponse(
              'Email has not been authenticated!',
              ErrorCode.EMAIL_NO_AUTHENTICATED,
            ),
          );
      } else if (error.message === ErrorCode.INCORRECT_PASSWORD) {
        response
          .status(HttpStatus.UNAUTHORIZED)
          .json(
            handleDataResponse(
              'Incorrect password! ',
              ErrorCode.INCORRECT_PASSWORD,
            ),
          );
      } else {
        response
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json(
            handleDataResponse(
              'Invalid confirmation link! ' + error.message,
              ErrorCode.INVALID_LINK_EMAIL_VERIFICATION,
            ),
          );
      }
    }
  }

  @Post('forgot-password')
  async resetPassword(
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
        response
          .status(HttpStatus.CONFLICT)
          .json(
            handleDataResponse(
              'Email is not registered!',
              ErrorCode.USER_NOT_FOUND,
            ),
          );
      } else if (error.message === ErrorCode.EMAIL_NO_AUTHENTICATED) {
        response
          .status(HttpStatus.CONFLICT)
          .json(
            handleDataResponse(
              'Email has not been authenticated!',
              ErrorCode.EMAIL_NO_AUTHENTICATED,
            ),
          );
      } else {
        response
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json(
            handleDataResponse(
              'Failed for request forgot password ' + error.message,
              ErrorCode.RESET_PASSWORD_FAIL,
            ),
          );
      }
    }
  }

  @Post('verify-otp')
  async verifyOTP(
    @Body('email') email: string,
    @Body('otp') otp: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      await this.authService.verifyOTPService(email, otp);
      response
        .status(HttpStatus.OK)
        .json(handleDataResponse('OTP is verified', 'OK'));
    } catch (error) {
      if (error.message === ErrorCode.OTP_INVALID) {
        response
          .status(HttpStatus.CONFLICT)
          .json(
            handleDataResponse(
              'OTP is expired or invalid',
              ErrorCode.OTP_INVALID,
            ),
          );
      } else {
        response
          .status(HttpStatus.INTERNAL_SERVER_ERROR)
          .json(
            handleDataResponse(
              'Failed for request forgot password ' + error.message,
              ErrorCode.SERVER_ERROR,
            ),
          );
      }
    }
  }
}
