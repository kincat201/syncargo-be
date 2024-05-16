import { PaymentAdvice } from 'src/entities/payment-advice.entity';
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm'

@Entity({ name: 'm_company_currencies'})
export class CompanyCurrency {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  name: string;

  @Column({
    unique: true,
    name: 'unit'
  })
  unit: string;

  @Column({
    name: 'exchange_rate',
    type: 'decimal',
    precision: 16,
    scale: 2,
    default: 1,
  })
  exchangeRate: number;

  @Column({ 
    name:'company_id'
  })
  companyId: number;
  
  @Column({
    name: 'created_by_user_id'
  })
  createdByUserId: number;

  @Column({
    default: 1
  })
  status: number

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => "CURRENT_TIMESTAMP",
  })
  createdAt: Date;
  
  @Column({
    name: 'updated_at',
    type: 'datetime',
    onUpdate: "CURRENT_TIMESTAMP",
    default: () => "CURRENT_TIMESTAMP",
  })
  updatedAt: Date;

  @OneToMany(() => PaymentAdvice, (payment) => payment.currency)
  paymentAdvices: PaymentAdvice[]
}