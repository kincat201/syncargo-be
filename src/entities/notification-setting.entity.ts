import { Customer } from 'src/entities/customer.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToMany,
} from 'typeorm';

@Entity({ name: 'm_notification_settings' })
export class NotificationSetting {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  label: string;

  @Column({
    name: 'category',
    enum: ['QUOTATION','SHIPMENT','INVOICE'],
    nullable: true,
  })
  category: number;

  @Column({
    default: 1,
  })
  status: number;

  @ManyToMany(() => Customer)
  customers: Customer[];
}
