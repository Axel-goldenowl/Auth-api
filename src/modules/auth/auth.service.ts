import * as bcrypt from 'bcrypt';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, HttpStatus } from '@nestjs/common';

import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { ErrorCode } from '@/common/enums';

import { LRUCache } from 'lru-cache';
import {
  EmailService,
  VERIFICATION_EMAIL_TEMPLATE,
  PASSWORD_RESET_REQUEST_TEMPLATE,
} from '@/modules/email';

import { User } from '@/modules/users/entities/user.entity';
import { UserDto } from '@/modules/users/dto/create-user.dto';
const options = {
  max: 500,
  maxSize: 5000,
  ttl: 1000 * 60 * 5,
  sizeCalculation: () => {
    return 1;
  },
};
const cache = new LRUCache(options);

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    private readonly emailService: EmailService,
    private readonly configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async registerService(userData: UserDto) {
    try {
      const existedUser = await this.userRepository.findOne({
        where: { email: userData.email },
      });

      if (existedUser) {
        return {
          statusCode: HttpStatus.CONFLICT,
          err: ErrorCode.EMAIL_ALREADY_REGISTERED,
          msg: 'Email is already registered',
        };
      }

      const hashedPassword = await bcrypt.hash(userData.password, 10);

      const newUser = this.userRepository.create({
        ...userData,
        password: hashedPassword,
      });

      const saveUser = await this.userRepository.save(newUser);

      if (saveUser.id) {
        const url = `${this.configService.get<string>('SERVER_API_URL')}/auth/confirm/${saveUser.id}`;

        await this.emailService.sendMail(
          saveUser.email,
          'Verify your email',
          VERIFICATION_EMAIL_TEMPLATE.replace('{url}', url),
        );

        return {
          statusCode: HttpStatus.CREATED,
          err: null,
          msg: 'Register successfully! Check and confirm your email',
        };
      } else {
        return {
          statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
          err: ErrorCode.REGISTRATION_FAILED,
          msg: 'Register failed',
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        err: ErrorCode.REGISTRATION_FAILED,
        msg: 'Register failed' + error,
      };
    }
  }

  async confirmEmailService(id: string) {
    try {
      const existedUser = await this.userRepository.findOne({
        where: { id },
      });
      if (existedUser) {
        existedUser.isAuthenticated = true;
        await this.userRepository.save(existedUser);
        return {
          err: null,
          msg: 'Email confirmed successfully!',
          statusCode: HttpStatus.ACCEPTED,
        };
      } else {
        return {
          err: ErrorCode.INVALID_LINK_EMAIL_VERIFICATION,
          msg: 'Invalid confirmation link.',
          statusCode: HttpStatus.BAD_REQUEST,
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        err: ErrorCode.SERVER_ERROR,
        msg: 'Confirmation failed',
      };
    }
  }

  async loginService(userData: UserDto) {
    try {
      const existedUser = await this.userRepository.findOne({
        where: { email: userData.email },
      });

      if (existedUser) {
        if (!existedUser.isAuthenticated) {
          return {
            statusCode: HttpStatus.CONFLICT,
            err: ErrorCode.EMAIL_NO_AUTHENTICATED,
            msg: 'Email has not been authenticated!',
          };
        }
        const isCorrectPassword = bcrypt.compareSync(
          userData.password,
          existedUser.password,
        );
        if (!isCorrectPassword) {
          return {
            statusCode: HttpStatus.UNAUTHORIZED,
            err: ErrorCode.INCORRECT_PASSWORD,
            msg: 'Incorrect password ',
          };
        }
        const token = await this.generateToken(existedUser);
        return {
          statusCode: HttpStatus.OK,
          err: null,
          msg: 'Login successfully! ',
          token,
        };
      }

      // eslint-disable-next-line @typescript-eslint/no-unused-vars
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        err: ErrorCode.LOGIN_FAILED,
        msg: 'Login failed' + error,
      };
    }
  }

  async forgotPasswordService(userEmail: string) {
    try {
      const existedUser = await this.userRepository.findOne({
        where: { email: userEmail },
      });

      if (!existedUser) {
        return {
          statusCode: HttpStatus.CONFLICT,
          err: ErrorCode.USER_NOT_FOUND,
          msg: 'Email is not registered',
        };
      }

      if (!existedUser.isAuthenticated) {
        return {
          statusCode: HttpStatus.CONFLICT,
          err: ErrorCode.EMAIL_NO_AUTHENTICATED,
          msg: 'Email has not been authenticated!',
        };
      }
      const verificationToken = Math.floor(
        100000 + Math.random() * 900000,
      ).toString();

      cache.set(`otp:${userEmail}`, verificationToken);

      await this.emailService.sendMail(
        userEmail,
        'Verify your email',
        PASSWORD_RESET_REQUEST_TEMPLATE.replace(
          '{verificationCode}',
          verificationToken,
        ),
      );

      return {
        statusCode: HttpStatus.OK,
        err: null,
        msg: 'Please check your email to confirm forget',
      };
    } catch (error) {
      return {
        statusCode: HttpStatus.INTERNAL_SERVER_ERROR,
        err: ErrorCode.RESET_PASSWORD_FAIL,
        msg: 'Reset password failed' + error,
      };
    }
  }
  async verifyOTPService(userEmail: string, verificationCode: string) {
    const storedOTP = cache.get(`otp:${userEmail}`);
    if (!storedOTP || storedOTP !== verificationCode) {
      return {
        statusCode: HttpStatus.BAD_REQUEST,
        err: ErrorCode.OTP_INVALID,
        msg: 'OTP is expired or invalid',
      };
    }
    cache.delete(`otp:${userEmail}`);
    return {
      statusCode: HttpStatus.OK,
      err: null,
      msg: 'OTP is verified',
    };
  }
  async generateToken(user: User): Promise<string> {
    const payload = { userName: user.name, userId: user.id };
    return this.jwtService.signAsync(payload);
  }
}
