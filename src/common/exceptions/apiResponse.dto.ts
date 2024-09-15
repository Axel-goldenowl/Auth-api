import { ApiProperty } from '@nestjs/swagger';

export class ApiResponseDto {
  @ApiProperty({ example: 'OK' })
  statusCode: string;

  @ApiProperty({ example: 'Message text here' })
  msg: string;
}
