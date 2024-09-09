import * as bcrypt from 'bcrypt';

import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable } from '@nestjs/common';

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

    const url = `${this.configService.get<string>('SERVER_API_URL')}/auth/confirm/${saveUser.id}`;

    await this.emailService.sendMail(
      saveUser.email,
      'Verify your email',
      VERIFICATION_EMAIL_TEMPLATE.replace('{url}', url),
    );
  }

  async confirmEmailService(id: string) {
    if (!id) {
      throw new Error(ErrorCode.MISSING_INPUT);
    }
    const existedUser = await this.userRepository.findOne({
      where: { id },
    });
    if (existedUser) {
      existedUser.isAuthenticated = true;
      await this.userRepository.save(existedUser);
    } else {
      throw new Error(ErrorCode.EMAIL_ALREADY_REGISTERED);
    }
  }

  async loginService(userData: UserDto) {
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

  async forgotPasswordService(userEmail: string) {
    const existedUser = await this.userRepository.findOne({
      where: { email: userEmail },
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

    cache.set(`otp:${userEmail}`, verificationToken);

    await this.emailService.sendMail(
      userEmail,
      'Verify your email',
      PASSWORD_RESET_REQUEST_TEMPLATE.replace(
        '{verificationCode}',
        verificationToken,
      ),
    );
  }
  async verifyOTPService(userEmail: string, verificationCode: string) {
    const storedOTP = cache.get(`otp:${userEmail}`);
    if (!storedOTP || storedOTP !== verificationCode) {
      throw new Error(ErrorCode.OTP_INVALID);
    }
    cache.delete(`otp:${userEmail}`);
  }
  async generateToken(user: User): Promise<string> {
    const payload = { userName: user.name, userId: user.id };
    return this.jwtService.signAsync(payload);
  }
}
