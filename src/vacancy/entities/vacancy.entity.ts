import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from "typeorm"

@Entity()
export class Vacancy {
  @PrimaryGeneratedColumn()
  id: number

  @Column()
  userId: string

  @Column({ nullable: true })
  username: string

  @Column()
  company: string

  @Column()
  technology: string

  @Column()
  contactTelegram: string

  @Column()
  location: string

  @Column()
  responsiblePerson: string

  @Column()
  salary: string

  @Column({ type: "text" })
  additionalInfo: string

  @Column()
  category: string

  @Column({
    type: "enum",
    enum: ["pending", "approved", "rejected", "filled"],
    default: "pending",
  })
  status: string

  @Column({ nullable: true })
  adminMessageId: number

  @Column({ nullable: true })
  groupMessageId: number

  @Column({ nullable: true })
  approvedAt: Date

  @Column({ nullable: true })
  filledAt: Date

  @CreateDateColumn()
  createdAt: Date

  @UpdateDateColumn()
  updatedAt: Date
}
