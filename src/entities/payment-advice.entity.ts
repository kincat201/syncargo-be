import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToMany } from 'typeorm'
import { Company } from 'src/entities/company.entity'
import { Bank } from 'src/entities/bank.entity';
import { Currency } from 'src/entities/currency.entity';
@Entity({ name: 'c_payment_advices'})
export class PaymentAdvice {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ 
    name:'company_id'
  })
  companyId: number;

  @Column({
    name: 'currency_name'
  })
  currencyName: string;

  @Column({ 
    name: 'bank_name'
  })
  bankName: string;

  @Column({ 
    name: 'acc_number'
  })
  accNumber: string;

  @Column({ 
    name: 'acc_holder' 
  })
  accHolder: string;

  @Column({ 
    name: 'payment_instructions'
  })
  paymentInstructions: string;

  @Column({
    default: 1,
  })
  status: number;
  
  @Column({
    name: 'created_by_user_id',
  })
  createdByUserId: number;

  @Column({
    name: 'updated_by_user_id',
    nullable: true,
  })
  updatedByUserId: number;

  @Column({
    name: 'deleted_by_user_id',
    nullable: true,
  })
  deletedByUserId: number;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'deleted_at',
    type: 'datetime',
    nullable: true,
  })
  deletedAt: Date;

  @Column({
    name: 'updated_at',
    type: 'datetime',
    onUpdate: 'CURRENT_TIMESTAMP',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ManyToOne(() => Company, (company) => company.paymentAdvices)
  @JoinColumn([
    { name: "company_id", referencedColumnName: "id" },
  ])
  company: Company;
  
  @ManyToOne(() => Bank , (bank) => bank.paymentAdvices)
  @JoinColumn([
    { name: "bank_name", referencedColumnName: "name" },
  ])
  bank: Bank

  @ManyToOne(() => Currency , (currency) => currency.paymentAdvices)
  @JoinColumn([
    { name: "currency_name", referencedColumnName: "name" },
  ])
  currency: Currency
}