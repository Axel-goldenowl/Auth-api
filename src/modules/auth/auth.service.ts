import * as bcrypt from 'bcrypt';

import { LRUCache } from 'lru-cache';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';

import { MailerService } from '@nestjs-modules/mailer';

import { ErrorCode } from '@/common/enums';

import { User } from '@/modules/users/entities/user.entity';

import { LoginUserDto } from '@/modules/users/dtos/login-user.dto';
import { CreateUserDto } from '@/modules/users/dtos/create-user.dto';
import { ConfirmEmailDto } from '@/modules/users/dtos/confirm-email.dto';
import { ForgotPasswordDto } from '@/modules/users/dtos/forgot-password.dto';

import { VerifyOtpDto } from './dtos/verity-otp.dto';

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
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private jwtService: JwtService,
  ) {}

  async registerService(userData: CreateUserDto) {
    if (
      userData.email === '' ||
      userData.name === '' ||
      userData.password === ''
    ) {
      throw new Error(ErrorCode.MISSING_INPUT);
    }

    const existedUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });

    if (existedUser) {
      throw new Error(ErrorCode.EMAIL_ALREADY_REGISTERED);
    }

    const hashedPassword = await bcrypt.hash(userData.password, 10);

    const newUser = this.userRepository.create({
      ...userData,
      password: hashedPassword,
    });

    const saveUser = await this.userRepository.save(newUser);

    const url = `${this.configService.get<string>('CLIENT_URL')}/auth/confirm/${saveUser.id}`;

    await this.mailerService.sendMail({
      to: saveUser.email,
      from: 'Anh bao',
      subject: 'Verify email',
      template: 'verification_email',
      context: {
        url: url,
      },
    });
  }

  async confirmEmailService(confirmData: ConfirmEmailDto) {
    if (!confirmData.id) {
      throw new Error(ErrorCode.MISSING_INPUT);
    }
    const existedUser = await this.userRepository.findOne({
      where: { id: confirmData.id },
    });
    if (existedUser) {
      existedUser.isAuthenticated = true;
      await this.userRepository.save(existedUser);
    } else {
      throw new Error(ErrorCode.EMAIL_ALREADY_REGISTERED);
    }
  }

  async loginService(userData: LoginUserDto) {
    const existedUser = await this.userRepository.findOne({
      where: { email: userData.email },
    });
    if (existedUser) {
      if (!existedUser.isAuthenticated) {
        throw new Error(ErrorCode.EMAIL_NO_AUTHENTICATED);
      }
      const isCorrectPassword = bcrypt.compareSync(
        userData.password,
        existedUser.password,
      );
      if (!isCorrectPassword) {
        throw new Error(ErrorCode.INCORRECT_PASSWORD);
      }
      const token = await this.generateToken(existedUser);

      return token;
    }
  }

  async forgotPasswordService(forgotPasswordData: ForgotPasswordDto) {
    const existedUser = await this.userRepository.findOne({
      where: { email: forgotPasswordData.email },
    });

    if (!existedUser) {
      throw new Error(ErrorCode.USER_NOT_FOUND);
    }

    if (!existedUser.isAuthenticated) {
      throw new Error(ErrorCode.EMAIL_NO_AUTHENTICATED);
    }
    const verificationToken = Math.floor(
      100000 + Math.random() * 900000,
    ).toString();

    cache.set(`otp:${forgotPasswordData.email}`, verificationToken);

    await this.mailerService.sendMail({
      to: forgotPasswordData.email,
      from: 'Anh bao',
      subject: 'Forgot password',
      template: 'password_reset_request',
      context: {
        verificationToken,
      },
    });
  }
  async verifyOTPService(verifyOtpData: VerifyOtpDto) {
    const storedOTP = cache.get(`otp:${verifyOtpData.email}`);
    if (!storedOTP || storedOTP !== verifyOtpData.otp) {
      throw new Error(ErrorCode.OTP_INVALID);
    }
    cache.delete(`otp:${verifyOtpData.email}`);
  }
  async verifyToken(token: string) {
    return await this.jwtService.verifyAsync(token, {
      secret: this.configService.get<string>('JWT_SECRET'),
    });
  }
  async generateToken(user: User): Promise<string> {
    const payload = { userName: user.name, userId: user.id, roles: user.roles };
    return this.jwtService.signAsync(payload);
  }
}
