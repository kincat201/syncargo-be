import {
  Entity,
  PrimaryGeneratedColumn,
  Column, ManyToOne, JoinColumn,
} from 'typeorm';
import { ChatRoomTypes } from '../enums/chat';
import { Customer } from './customer.entity';
import { Company } from './company.entity';
import { Quotation } from './quotation.entity';

@Entity({ name: 't_chat_room' })
export class ChatRoom {
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
    nullable: true,
  })
  affiliation: string;

  @Column({
    name: 'rfq_number',
  })
  rfqNumber: string;

  @Column({
    name: 'types',
    enum: ChatRoomTypes,
    default: ChatRoomTypes.GENERAL
  })
  types: string;

  @Column({
    name: 'unread_message_customer',
    default:0,
  })
  unreadMessageCustomer: number;

  @Column({
    name: 'unread_message_ff',
    default:0,
  })
  unreadMessageFF: number;

  @Column({
    name: 'last_message'
  })
  lastMessage: string;

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

  @ManyToOne(() => Company, (company) => company.chatRooms)
  @JoinColumn([{ name: 'company_id', referencedColumnName: 'id' }])
  company: Company;

  @ManyToOne(() => Customer, (customer) => customer.chatRooms)
  @JoinColumn([{ name: 'customer_id', referencedColumnName: 'customerId' }])
  customer: Customer;

  @ManyToOne(() => Quotation, (quotation) => quotation.chatRoom)
  @JoinColumn([{ name: 'rfq_number', referencedColumnName: 'rfqNumber' }])
  quotation: Quotation;

}
