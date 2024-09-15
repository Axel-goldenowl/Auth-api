import { IsString, IsNotEmpty } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class ConfirmEmailDto {
  @IsString({ message: 'Id must be a string' })
  @IsNotEmpty({ message: 'Id is required' })
  @ApiProperty()
  id: string;
}
