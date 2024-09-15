import { OmitType } from '@nestjs/swagger';
import { CreateUserDto } from './create-user.dto';

export class LoginUserDto extends OmitType(CreateUserDto, ['name'] as const) {}
