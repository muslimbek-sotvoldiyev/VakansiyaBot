import { Module, forwardRef } from "@nestjs/common"
import { TelegramService } from "./telegram.service"
import { TelegramUpdate } from "./telegram.update"
import { TelegrafModule } from "nestjs-telegraf"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { VacancyModule } from "../vacancy/vacancy.module"
import { session } from "telegraf/session"

@Module({
  imports: [
    ConfigModule,
    TelegrafModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        token: configService.get<string>("TELEGRAM_BOT_TOKEN"),
        middlewares: [session()],
      }),
    }),
    forwardRef(() => VacancyModule),
  ],
  providers: [TelegramService, TelegramUpdate, ConfigService],
  exports: [TelegramService],
})
export class TelegramModule {}
