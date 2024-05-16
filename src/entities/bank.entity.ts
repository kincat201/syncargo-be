import { PaymentAdvice } from 'src/entities/payment-advice.entity';
import { JoinColumn, Entity, PrimaryGeneratedColumn, Column, ManyToOne, OneToMany } from 'typeorm'

@Entity({ name: 'm_banks'})
export class Bank {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    unique: true,
  })
  name: string;

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

  @OneToMany(() => PaymentAdvice, (payment) => payment.bank)
  paymentAdvices: PaymentAdvice[]
}