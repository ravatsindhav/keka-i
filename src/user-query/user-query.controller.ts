import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Req, Request, Res } from '@nestjs/common';
import { UserQueryService } from './user-query.service';
import { UserQuery, UserQueryResponse } from './user-query.model';
import { ApiResponse } from '@nestjs/swagger';

@Controller('user-query')
export class UserQueryController {
  constructor(private readonly userService: UserQueryService) { }

  @Post()
  @ApiResponse({
    status: 200,
    description: "The record found",
    type: [UserQueryResponse]
  })
  @HttpCode(HttpStatus.OK)
  async req(@Request() req: any) {
    return this.userService.generateResponse(req.body);
  }

}
