import { Injectable, Inject } from "@nestjs/common"
import { InjectBot } from "nestjs-telegraf"
import type { Telegraf, Context } from "telegraf"
import { ConfigService } from "@nestjs/config"
import type { VacancyDocument } from "../vacancy/schemas/vacancy.schema"

@Injectable()
export class TelegramService {
  private readonly adminChatIds: string[]
  private readonly groupChatId: string;

  constructor(
    @InjectBot() private bot: Telegraf<Context>,
    @Inject(ConfigService) private configService: ConfigService,
  ) {
    // Ko'p adminlarni qo'llab-quvvatlash uchun vergul bilan ajratilgan ro'yxatni qabul qilamiz
    const adminChatIdsString = this.configService.get<string>("ADMIN_CHAT_IDS", "")
    this.adminChatIds = adminChatIdsString.split(",").map(id => id.trim()).filter(id => id !== "")
    
    this.groupChatId = this.configService.get<string>("GROUP_CHAT_ID")
  }

  async sendVacancyToAdmin(vacancy: VacancyDocument): Promise<number> {
    const message = this.formatVacancyMessage(vacancy)
    let lastMessageId = 0

    // Barcha adminlarga xabar yuborish
    for (const adminChatId of this.adminChatIds) {
      try {
        const sentMessage = await this.bot.telegram.sendMessage(adminChatId, message, {
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

        // Oxirgi xabar ID-sini saqlash
        lastMessageId = sentMessage.message_id
      } catch (error) {
        console.error(`Admin ${adminChatId} ga xabar yuborishda xatolik: ${error.message}`)
      }
    }

    return lastMessageId
  }

  // Vakansiya tasdiqlanganda barcha adminlarga xabar yuborish
  async notifyAdminsAboutApproval(vacancy: VacancyDocument, approvingAdminId: string): Promise<void> {
    const message = `Vakansiya "${vacancy.company}" tasdiqlandi va guruhga joylashtirildi.`

    for (const adminChatId of this.adminChatIds) {
      // Tasdiqlagan admindan boshqa barcha adminlarga xabar yuborish
      if (adminChatId !== approvingAdminId) {
        try {
          await this.bot.telegram.sendMessage(adminChatId, message)
        } catch (error) {
          console.error(`Admin ${adminChatId} ga xabar yuborishda xatolik: ${error.message}`)
        }
      }
    }
  }

  // Vakansiya rad etilganda barcha adminlarga xabar yuborish
  async notifyAdminsAboutRejection(vacancy: VacancyDocument, rejectingAdminId: string): Promise<void> {
    const message = `Vakansiya "${vacancy.company}" rad etildi.`

    for (const adminChatId of this.adminChatIds) {
      // Rad etgan admindan boshqa barcha adminlarga xabar yuborish
      if (adminChatId !== rejectingAdminId) {
        try {
          await this.bot.telegram.sendMessage(adminChatId, message)
        } catch (error) {
          console.error(`Admin ${adminChatId} ga xabar yuborishda xatolik: ${error.message}`)
        }
      }
    }
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

    try {
      await this.bot.telegram.editMessageCaption(this.groupChatId, messageId, undefined, filledMessage, {
        parse_mode: "Markdown",
      })
    } catch (error) {
      console.error(`Guruhda xabarni yangilashda xatolik: ${error.message}`)
    }
  }

  async sendFollowUpToEmployer(vacancy: VacancyDocument): Promise<void> {
    try {
      await this.bot.telegram.sendMessage(
        vacancy.userId,
        `*${vacancy.company}*  kompaniyasi uchun e'lon bergan vakansiyangiz bo'yicha ishchi topdingizmi?`,
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
    } catch (error) {
      console.error(`Foydalanuvchiga xabar yuborishda xatolik: ${error.message}`)
    }
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
        return "https://i.postimg.cc/kG1DpmWQ/vakansiya.png"
      case "design":
        return "https://i.postimg.cc/kG1DpmWQ/vakansiya.png"
      case "smm":
        return "https://i.postimg.cc/kG1DpmWQ/vakansiya.png"
      default:
        return "https://i.postimg.cc/kG1DpmWQ/vakansiya.png"
    }
  }
}
