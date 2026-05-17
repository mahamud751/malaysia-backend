import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { PrismaModule } from './common/prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { PropertiesModule } from './properties/properties.module';
import { ViewingsModule } from './viewings/viewings.module';
import { UploadsModule } from './uploads/uploads.module';
import { SavedPropertiesModule } from './saved-properties/saved-properties.module';
import { ChatsModule } from './chats/chats.module';
import { AreasModule } from './areas/areas.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    AuthModule,
    UsersModule,
    PropertiesModule,
    ViewingsModule,
    UploadsModule,
    SavedPropertiesModule,
    ChatsModule,
    AreasModule,
  ],
  controllers: [AppController],
})
export class AppModule {}
