import { Injectable, Inject } from "@nestjs/common"
import { InjectBot } from "nestjs-telegraf"
import type { Telegraf, Context } from "telegraf"
import { ConfigService } from "@nestjs/config"
import type { VacancyDocument } from "../vacancy/schemas/vacancy.schema"

@Injectable()
export class TelegramService {
  private readonly adminChatId: string
  private readonly groupChatId: string;

  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    @Inject(ConfigService) private configService: ConfigService,
  ) {
    this.adminChatId = this.configService.get<string>("ADMIN_CHAT_ID")
    this.groupChatId = this.configService.get<string>("GROUP_CHAT_ID")
  }

  async sendVacancyToAdmin(vacancy: VacancyDocument): Promise<number> {
    const message = this.formatVacancyMessage(vacancy)

    const sentMessage = await this.bot.telegram.sendMessage(this.adminChatId, message, {
      parse_mode: "Markdown",
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✅ Tasdiqlash", callback_data: `approve_${vacancy._id}` },
            { text: "❌ Rad etish", callback_data: `reject_${vacancy._id}` },
          ],
        ],
      },
    })

    return sentMessage.message_id
  }

  async postVacancyToGroup(vacancy: VacancyDocument): Promise<number> {
    const message = this.formatVacancyMessage(vacancy)
    const hashtags = this.generateHashtags(vacancy)
    const fullMessage = `${message}\n\n${hashtags}`

    const imageUrl = this.getImageUrlForCategory(vacancy.category)

    const sentMessage = await this.bot.telegram.sendPhoto(
      this.groupChatId,
      { url: imageUrl },
      {
        caption: fullMessage,
        parse_mode: "Markdown",
      },
    )

    return sentMessage.message_id
  }

  async updateVacancyInGroup(vacancy: VacancyDocument, messageId: number): Promise<void> {
    const message = this.formatVacancyMessage(vacancy)
    const hashtags = this.generateHashtags(vacancy)

    // Add the "filled" notice
    const filledMessage = `${message}\n\n⚠️ *ISHCHI TOPILDI* ⚠️\n\n${hashtags}`

    await this.bot.telegram.editMessageCaption(this.groupChatId, messageId, undefined, filledMessage, {
      parse_mode: "Markdown",
    })
  }

  async sendFollowUpToEmployer(vacancy: VacancyDocument): Promise<void> {
    await this.bot.telegram.sendMessage(
      vacancy.userId,
      `*${vacancy.company}* kompaniyasi uchun e'lon bergan vakansiyangiz bo'yicha ishchi topdingizmi?`,
      {
        parse_mode: "Markdown",
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✅ Ha, topdim", callback_data: `filled_${vacancy._id}` },
              { text: "❌ Yo'q, hali topilmadi", callback_data: `not_filled_${vacancy._id}` },
            ],
          ],
        },
      },
    )
  }

  private formatVacancyMessage(vacancy: VacancyDocument): string {
    return `
🏢 Idora: ${vacancy.company}
📚 Texnologiya: ${vacancy.technology}
🇺🇿 Telegram: ${vacancy.contactTelegram}
🌐 Hudud: ${vacancy.location}
✍️ Mas'ul: ${vacancy.responsiblePerson}
💰 Maosh: ${vacancy.salary}
‼️ Qo'shimcha: ${vacancy.additionalInfo}
`
  }

  private generateHashtags(vacancy: VacancyDocument): string {
    const tags = [
      "#ishJoyi",
      `#${vacancy.company.replace(/\s+/g, "_")}`,
      `#${vacancy.technology.replace(/\s+/g, "_")}`,
      `#${vacancy.location.replace(/\s+/g, "_")}`,
    ]

    return tags.join(" ")
  }

  private getImageUrlForCategory(category: string): string {
    switch (category) {
      case "programming":
        return "https://i.postimg.cc/kG1DpmWQ/programming.png"
      case "design":
        return "https://i.postimg.cc/kM0WQQFv/design.png"
      case "smm":
        return "https://i.postimg.cc/3JHyRBP2/smm.png"
      default:
        return "https://i.postimg.cc/kG1DpmWQ/default.png"
    }
  }
}
