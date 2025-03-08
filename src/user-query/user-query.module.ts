import { Module } from '@nestjs/common';
import { UserQueryController } from './user-query.controller';
import { UserQueryService } from './user-query.service';

@Module({
    controllers: [UserQueryController],
    providers: [UserQueryService]
})
export class UserQueryModule {}
