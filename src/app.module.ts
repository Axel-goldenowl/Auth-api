import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { MailerModule } from '@nestjs-modules/mailer';

import { EjsAdapter } from '@nestjs-modules/mailer/dist/adapters/ejs.adapter';

import { DatabaseModule } from '@/database/database.module';

import { AuthModule } from '@/modules/auth/auth.module';
import { UsersModule } from '@/modules/users/users.module';

import { AppController } from './app.controller';
import { AppService } from './app.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    MailerModule.forRoot({
      transport: {
        host: process.env.EMAIL_HOST,
        port: +process.env.EMAIL_PORT,
        ignoreTLS: true,
        secure: false,
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      },
      defaults: {
        from: process.env.EMAIL_SENDER,
      },
      template: {
        dir: __dirname + '/templates/',
        adapter: new EjsAdapter({ inlineCssEnabled: true }),
        options: {
          strict: false,
        },
      },
    }),
    DatabaseModule,
    AuthModule,
    UsersModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
