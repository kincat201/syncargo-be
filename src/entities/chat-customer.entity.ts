import {
  Entity,
  PrimaryGeneratedColumn,
  Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { Customer } from './customer.entity';
import { Company } from './company.entity';

@Entity({ name: 't_chat_customer' })
export class ChatCustomer {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'customer_id',
  })
  customerId: string;

  @Column({
    name: 'company_id',
  })
  companyId: number;

  @Column({
    name: 'unread_message',
    default:0,
  })
  unreadMessage: number;

  @Column({
    name: 'unread_message_ff',
    default:0,
  })
  unreadMessageFF: number;

  @Column({
    default: 1,
  })
  status: number;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'updated_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  @ManyToOne(() => Company, (company) => company.users)
  @JoinColumn([{ name: 'company_id', referencedColumnName: 'id' }])
  company: Company;

  @ManyToOne(() => Customer, (customer) => customer.chatCustomers)
  @JoinColumn([{ name: 'customer_id', referencedColumnName: 'customerId' }])
  customer: Customer;
}
