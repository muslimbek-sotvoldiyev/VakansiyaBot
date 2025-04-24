import { Action, Ctx, Hears, InjectBot, On, Start, Update } from "nestjs-telegraf"
import { type Telegraf, type Context, Markup } from "telegraf"
import { Inject, forwardRef } from "@nestjs/common"
import { VacancyService } from "../vacancy/vacancy.service"
import { TelegramService } from "./telegram.service"
import type { CreateVacancyDto } from "../vacancy/dto/create-vacancy.dto"

interface BotContext extends Context {
  session: {
    vacancyData?: Partial<CreateVacancyDto>
    step?: string
  }
  match?: RegExpMatchArray
}

@Update()
export class TelegramUpdate {
  constructor(
    @InjectBot()
    private readonly bot: Telegraf<BotContext>,
    @Inject(forwardRef(() => VacancyService))
    private readonly vacancyService: VacancyService,
    @Inject(forwardRef(() => TelegramService))
    private readonly telegramService: TelegramService,
  ) {}

  @Start()
  async startCommand(@Ctx() ctx: BotContext) {
    await ctx.reply(
      `Assalomu alaykum! Vakansiya e'lon qilish botiga xush kelibsiz.
      
Bu bot orqali siz o'z kompaniyangiz uchun vakansiya e'lonini yaratishingiz mumkin. E'lon ma'murlar tomonidan tasdiqlanganidan so'ng, u guruhga joylashtiriladi.`,
      Markup.keyboard([["📝 Vakansiya yaratish"]])
        .oneTime()
        .resize(),
    )
  }

  @Hears("📝 Vakansiya yaratish")
  async createVacancy(@Ctx() ctx: BotContext) {
    ctx.session = { vacancyData: {}, step: "category" }
    
    await ctx.reply(
      "Qaysi soha bo'yicha ishchi qidiryapsiz?",
      Markup.inlineKeyboard([
        [Markup.button.callback("💻 Dasturlash", "category_programming")],
        [Markup.button.callback("🎨 Dizayn", "category_design")],
        [Markup.button.callback("📱 SMM", "category_smm")],
        [Markup.button.callback("🔄 Boshqa", "category_other")],
      ]),
    )
  }

  @Action(/category_(.+)/)
  async handleCategory(@Ctx() ctx: BotContext) {
    const category = ctx.match[1]
    ctx.session.vacancyData.category = category
    ctx.session.step = "company"
    
    await ctx.editMessageText("Kategoriya tanlandi.")
    await ctx.reply("Kompaniya nomini kiriting:")
  }

  @On("text")
  async handleTextInput(@Ctx() ctx: BotContext) {
    if (!ctx.session?.step) return
    
    let text: string;
    if ('text' in ctx.message) {
      text = ctx.message.text;
    } else {
      return null
    }
    const userId = ctx.from.id;
    
    switch (ctx.session.step) {
      case "company":
        ctx.session.vacancyData.company = text;
        ctx.session.step = "technology"
        await ctx.reply("Qanday texnologiyalar/ko'nikmalar talab qilinadi?")
        break
        
      case "technology":
        ctx.session.vacancyData.technology = text
        ctx.session.step = "contactTelegram"
        await ctx.reply("Telegram aloqa (username yoki link):")
        break
        
      case "contactTelegram":
        ctx.session.vacancyData.contactTelegram = text
        ctx.session.step = "location"
        await ctx.reply("Ish joyi joylashgan hudud:")
        break
        
      case "location":
        ctx.session.vacancyData.location = text
        ctx.session.step = "responsiblePerson"
        await ctx.reply("Mas'ul shaxs (HR yoki menejer):")
        break
        
      case "responsiblePerson":
        ctx.session.vacancyData.responsiblePerson = text
        ctx.session.step = "salary"
        await ctx.reply("Taklif qilinayotgan maosh:")
        break
        
      case "salary":
        ctx.session.vacancyData.salary = text
        ctx.session.step = "additionalInfo"
        await ctx.reply("Qo'shimcha ma'lumotlar (ish vaqti, talablar, va h.k.):")
        break
        
      case "additionalInfo":
        ctx.session.vacancyData.additionalInfo = text
        ctx.session.step = "confirm"
        
        // Prepare confirmation message
        const vacancyPreview = `
🏢 Idora: ${ctx.session.vacancyData.company}
📚 Texnologiya: ${ctx.session.vacancyData.technology}
🇺🇿 Telegram: ${ctx.session.vacancyData.contactTelegram}
🌐 Hudud: ${ctx.session.vacancyData.location}
✍️ Mas'ul: ${ctx.session.vacancyData.responsiblePerson}
💰 Maosh: ${ctx.session.vacancyData.salary}
‼️ Qo'shimcha: ${ctx.session.vacancyData.additionalInfo}
        `
        
        await ctx.reply(
          `Vakansiya ma'lumotlarini tekshiring:\n${vacancyPreview}`,
          Markup.inlineKeyboard([
            [Markup.button.callback("✅ Tasdiqlash", "confirm_vacancy")],
            [Markup.button.callback("🔄 Qayta to'ldirish", "restart_vacancy")],
          ]),
        )
        break
    }
  }

  @Action("confirm_vacancy")
  async confirmVacancy(@Ctx() ctx: BotContext) {
    const userId = ctx.from.id
    const username = ctx.from.username || ""
    
    // Create vacancy in database
    const vacancyData = {
      ...ctx.session.vacancyData,
      userId: userId.toString(),
      username,
      status: "pending",
    }

    if (!vacancyData.company) {
      throw new Error("Company is required to create a vacancy.")
    }

    const vacancy = await this.vacancyService.createVacancy(vacancyData as CreateVacancyDto)
    
    await ctx.editMessageText("Vakansiya ma'lumotlari tasdiqlandi.")
    await ctx.reply(
      "Vakansiyangiz ma'murlar ko'rib chiqishi uchun yuborildi. Tasdiqlangandan so'ng guruhga joylashtiriladi.",
    )
    
    // Reset session
    ctx.session = {}
  }

  @Action("restart_vacancy")
  async restartVacancy(@Ctx() ctx: BotContext) {
    ctx.session = { vacancyData: {}, step: "category" }
    
    await ctx.editMessageText("Vakansiya yaratish qayta boshlandi.")
    await ctx.reply(
      "Qaysi soha bo'yicha ishchi qidiryapsiz?",
      Markup.inlineKeyboard([
        [Markup.button.callback("💻 Dasturlash", "category_programming")],
        [Markup.button.callback("🎨 Dizayn", "category_design")],
        [Markup.button.callback("📱 SMM", "category_smm")],
        [Markup.button.callback("🔄 Boshqa", "category_other")],
      ]),
    )
  }

  @Action(/approve_(.+)/)
  async approveVacancy(@Ctx() ctx: BotContext) {
    const vacancyId = ctx.match[1]
    const adminChatId = ctx.chat.id.toString()
    
    // Vakansiyani tasdiqlash
    const vacancy = await this.vacancyService.approveVacancy(vacancyId)
    
    // Tasdiqlagan adminga xabar yuborish
    await ctx.editMessageText("Vakansiya tasdiqlandi va guruhga joylashtirildi.")
    
    // Boshqa adminlarga xabar yuborish
    await this.telegramService.notifyAdminsAboutApproval(vacancy, adminChatId)
  }

  @Action(/reject_(.+)/)
  async rejectVacancy(@Ctx() ctx: BotContext) {
    const vacancyId = ctx.match[1]
    const adminChatId = ctx.chat.id.toString()
    
    // Vakansiyani rad etish
    const vacancy = await this.vacancyService.rejectVacancy(vacancyId)
    
    // Rad etgan adminga xabar yuborish
    await ctx.editMessageText("Vakansiya rad etildi.")
    
    // Boshqa adminlarga xabar yuborish
    await this.telegramService.notifyAdminsAboutRejection(vacancy, adminChatId)
  }
   
  @Action(/not_filled_(.+)/)
  async markVacancyNotFilled(@Ctx() ctx: BotContext) {
    await ctx.answerCbQuery("Qabul qilindi"); 
    await ctx.editMessageText("Tushunildi. Vakansiya hali ham faol.") 
  }

  @Action(/filled_(.+)/)
  async markVacancyFilled(@Ctx() ctx: BotContext) {
    const vacancyId = ctx.match[1]
    await this.vacancyService.markVacancyFilled(vacancyId)
    
    await ctx.editMessageText("Vakansiya to'ldirilgan deb belgilandi. Guruhda e'lon yangilandi.")
  }

}
