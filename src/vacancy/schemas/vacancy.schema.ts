import { Prop, Schema, SchemaFactory } from "@nestjs/mongoose"
import type { Document } from "mongoose"

export type VacancyDocument = Vacancy & Document

@Schema({ timestamps: true })
export class Vacancy {
  @Prop({ required: true })
  userId: string

  @Prop()
  username: string

  @Prop({ required: true })
  company: string

  @Prop({ required: true })
  technology: string

  @Prop({ required: true })
  contactTelegram: string

  @Prop({ required: true })
  location: string

  @Prop({ required: true })
  responsiblePerson: string

  @Prop({ required: true })
  salary: string

  @Prop({ required: true })
  additionalInfo: string

  @Prop({ required: true })
  category: string

  @Prop({
    required: true,
    enum: ["pending", "approved", "rejected", "filled"],
    default: "pending",
  })
  status: string

  @Prop()
  adminMessageId: number

  @Prop()
  groupMessageId: number

  @Prop()
  approvedAt: Date

  @Prop()
  filledAt: Date
}

export const VacancySchema = SchemaFactory.createForClass(Vacancy)
