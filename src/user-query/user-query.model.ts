import { ApiProperty } from '@nestjs/swagger';

export class UserQuery {
  @ApiProperty({ required: true })
  message: string;
  @ApiProperty({ required: true })
  role: string;
}

export class UserQueryResponse {
  @ApiProperty()
  message: string;
}