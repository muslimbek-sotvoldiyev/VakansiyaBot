import { Injectable, Inject, forwardRef } from "@nestjs/common"
import { InjectModel } from "@nestjs/mongoose"
import type { Model } from "mongoose"
import { Vacancy, type VacancyDocument } from "./schemas/vacancy.schema"
import type { CreateVacancyDto } from "./dto/create-vacancy.dto"
import { TelegramService } from "../telegram/telegram.service"
import { Cron } from "@nestjs/schedule"

@Injectable()
export class VacancyService {
  constructor(
    @InjectModel(Vacancy.name) private vacancyModel: Model<VacancyDocument>,
    @Inject(forwardRef(() => TelegramService))
    private telegramService: TelegramService,
  ) {}

  async createVacancy(createVacancyDto: CreateVacancyDto): Promise<VacancyDocument> {
    const createdVacancy = new this.vacancyModel(createVacancyDto)
    const savedVacancy = await createdVacancy.save()

    // Send to admin for approval
    const adminMessageId = await this.telegramService.sendVacancyToAdmin(savedVacancy)

    // Update with admin message ID
    savedVacancy.adminMessageId = adminMessageId
    return savedVacancy.save()
  }

  async approveVacancy(id: string): Promise<VacancyDocument> {
    const vacancy = await this.vacancyModel.findById(id)

    if (!vacancy) {
      throw new Error("Vacancy not found")
    }

    // Post to group
    const groupMessageId = await this.telegramService.postVacancyToGroup(vacancy)

    // Update vacancy status and message ID
    vacancy.status = "approved"
    vacancy.groupMessageId = groupMessageId
    vacancy.approvedAt = new Date()

    return vacancy.save()
  }

  async rejectVacancy(id: string): Promise<VacancyDocument> {
    const vacancy = await this.vacancyModel.findById(id)

    if (!vacancy) {
      throw new Error("Vacancy not found")
    }

    vacancy.status = "rejected"
    return vacancy.save()
  }

  async markVacancyFilled(id: string): Promise<VacancyDocument> {
    const vacancy = await this.vacancyModel.findById(id)

    if (!vacancy) {
      throw new Error("Vacancy not found")
    }

    vacancy.status = "filled"
    vacancy.filledAt = new Date()

    // Update the group message
    if (vacancy.groupMessageId) {
      await this.telegramService.updateVacancyInGroup(vacancy, vacancy.groupMessageId)
    }

    return vacancy.save()
  }

  // @Cron("* * * * *")
  // async checkVacanciesForFollowUp() {
  //   // Vaqt chegarasini 2 kundan 1 daqiqaga o'zgartirish
  //   const oneMinuteAgo = new Date()
  //   oneMinuteAgo.setMinutes(oneMinuteAgo.getMinutes() - 1)

  //   // 1 daqiqa oldin tasdiqlangan vakansiyalarni topish
  //   const vacancies = await this.vacancyModel.find({
  //     status: "approved",
  //     approvedAt: {
  //       $gte: new Date(oneMinuteAgo.getTime()),
  //       $lt: new Date(),
  //     },
  //   })

  //   // Qolgan kodlar o'zgarmaydi - har bir vakansiya uchun so'rov yuboradi
  //   for (const vacancy of vacancies) {
  //     await this.telegramService.sendFollowUpToEmployer(vacancy)
  //   }
  // }

  // Har daqiqa ishga tushadi
@Cron("* * * * *")
async checkVacanciesForFollowUp() {
  const now = new Date();
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000); // 1 daqiqa oldingi vaqt

  // Oxirgi 1 daqiqa ichida tasdiqlangan vakansiyalarni olish
  const vacancies = await this.vacancyModel.find({
    status: "approved",
    approvedAt: {
      $gte: oneMinuteAgo,
      $lt: now,
    },
  });

  for (const vacancy of vacancies) {
    await this.telegramService.sendFollowUpToEmployer(vacancy);
  }
}

}
