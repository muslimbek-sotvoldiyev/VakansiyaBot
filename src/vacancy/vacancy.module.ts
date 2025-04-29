import { Module, forwardRef } from "@nestjs/common"
import { MongooseModule } from "@nestjs/mongoose"
import { VacancyService } from "./vacancy.service"
import { Vacancy, VacancySchema } from "./schemas/vacancy.schema"
import { TelegramModule } from "../telegram/telegram.module"

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Vacancy.name, schema: VacancySchema }]),
    forwardRef(() => TelegramModule), 
  ],
  providers: [VacancyService],
  exports: [VacancyService],
})
export class VacancyModule {}
