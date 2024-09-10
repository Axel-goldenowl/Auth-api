import {
  Controller,
  Post,
  Body,
  Res,
  HttpStatus,
  ForbiddenException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';

import { Response } from 'express';

import { ErrorCode } from '@/common/enums';

import {
  ApiBadRequestResponse,
  ApiConflictResponse,
  ApiCreatedResponse,
  ApiNotFoundResponse,
  ApiOkResponse,
  ApiTags,
} from '@nestjs/swagger';

import { handleDataResponse } from '@/utils';

import { AuthService } from '@/modules/auth/auth.service';
import { LoginUserDto } from '@/modules/users/dtos/login-user.dto';
import { CreateUserDto } from '@/modules/users/dtos/create-user.dto';
import { ForgotPasswordDto } from '../users/dtos/forgot-password.dto';
import { ConfirmEmailDto } from '@/modules/users/dtos/confirm-email.dto';

import { VerifyOtpDto } from './dtos/verity-otp.dto';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiCreatedResponse({
    description: 'The user has been successfully registered.',
  })
  @ApiConflictResponse({ description: 'Email is already registered!' })
  async register(
    @Body() userData: CreateUserDto,
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

  @Post('confirm')
  @ApiOkResponse({
    description: 'Confirm email successfully!!.',
  })
  @ApiBadRequestResponse({ description: 'Missing input!' })
  async confirm(
    @Body() confirmData: ConfirmEmailDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      await this.authService.confirmEmailService(confirmData);
      response
        .status(HttpStatus.OK)
        .json(handleDataResponse('Confirm email successfully!!'));
    } catch (error) {
      if (error.message === ErrorCode.MISSING_INPUT) {
        throw new BadRequestException(ErrorCode.MISSING_INPUT);
      } else {
        throw error;
      }
    }
  }

  @Post('login')
  @ApiOkResponse({
    description: 'Login successfully!!',
  })
  @ApiConflictResponse({ description: 'Email has not been confirmed!' })
  @ApiBadRequestResponse({ description: 'Incorrect password!' })
  async login(
    @Body() userData: LoginUserDto,
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

  @Post('forgot-password')
  @ApiOkResponse({ description: 'Please check your email to confirm forget' })
  @ApiNotFoundResponse({ description: 'Email is not registered!' })
  async forgotPassword(
    @Body() forgotPasswordData: ForgotPasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      await this.authService.forgotPasswordService(forgotPasswordData);
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

  @Post('verify-otp')
  @ApiOkResponse({ description: 'OTP is verified' })
  @ApiBadRequestResponse({ description: 'OTP is expired or invalid!' })
  async verifyOTP(
    @Body() otpData: VerifyOtpDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    try {
      await this.authService.verifyOTPService(otpData);
      response
        .status(HttpStatus.OK)
        .json(handleDataResponse('OTP is verified', 'OK'));
    } catch (error) {
      if (error.message === ErrorCode.OTP_INVALID) {
        throw new BadRequestException(ErrorCode.OTP_INVALID);
      } else {
        throw error;
      }
    }
  }
}
