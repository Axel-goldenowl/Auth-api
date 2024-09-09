import { ErrorCode } from '@/common/enums';
import { HttpStatus } from '@nestjs/common';

export const exceptionCase = {
  [ErrorCode.EMAIL_ALREADY_REGISTERED]: {
    status: HttpStatus.CONFLICT,
    message: 'Email is already registered!',
    errorCode: ErrorCode.EMAIL_ALREADY_REGISTERED,
  },
  [ErrorCode.EMAIL_NO_AUTHENTICATED]: {
    status: HttpStatus.CONFLICT,
    message: 'Email has not been authenticated!',
    errorCode: ErrorCode.EMAIL_NO_AUTHENTICATED,
  },
  [ErrorCode.INCORRECT_PASSWORD]: {
    status: HttpStatus.UNAUTHORIZED,
    message: 'Incorrect password!',
    errorCode: ErrorCode.INCORRECT_PASSWORD,
  },
  [ErrorCode.USER_NOT_FOUND]: {
    status: HttpStatus.NOT_FOUND,
    message: 'Email is not registered!',
    errorCode: ErrorCode.USER_NOT_FOUND,
  },
  [ErrorCode.OTP_INVALID]: {
    status: HttpStatus.CONFLICT,
    message: 'OTP is expired or invalid!',
    errorCode: ErrorCode.OTP_INVALID,
  },
  [ErrorCode.MISSING_INPUT]: {
    status: HttpStatus.NOT_ACCEPTABLE,
    message: 'Missing input!',
    errorCode: ErrorCode.MISSING_INPUT,
  },
  [ErrorCode.INVALID_LINK_EMAIL_VERIFICATION]: {
    status: HttpStatus.BAD_REQUEST,
    message: 'Invalid confirmation link!',
    errorCode: ErrorCode.INVALID_LINK_EMAIL_VERIFICATION,
  },
};
