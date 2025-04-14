import { Module } from "@nestjs/common"
import { ConfigModule, ConfigService } from "@nestjs/config"
import { MongooseModule } from "@nestjs/mongoose"
import { ScheduleModule } from "@nestjs/schedule"
import { TelegramModule } from "./telegram/telegram.module"
import { VacancyModule } from "./vacancy/vacancy.module"

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Make ConfigModule global so it's available everywhere
    }),
    MongooseModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        uri: configService.get<string>("MONGODB_URI", "mongodb://localhost:27017/vacancy_bot"),
      }),
    }),
    ScheduleModule.forRoot(),
    TelegramModule,
    VacancyModule,
  ],
})
export class AppModule {}
