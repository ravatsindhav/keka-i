import { Controller, Get, Query } from '@nestjs/common';
import { UserQueryService } from './user-query.service';

@Controller('user-query')
export class UserQueryController {
    constructor(private readonly userService: UserQueryService) {}

    @Get()
    async query(@Query('text') text: string) {
      return this.userService.generateResponse(text);
    }

}
