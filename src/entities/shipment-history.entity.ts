import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn } from 'typeorm'
import { User } from './user.entity';

@Entity({ name: 't_shipment_histories' })
export class ShipmentHistory {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'rfq_number',
  })
  rfqNumber: string;

  @Column({
    nullable: true,
  })
  description: string;

  @Column({
    nullable: true,
  })
  details: string;

  // general

  @Column({
    default: 1,
  })
  status: number;

  @Column({
    name: 'created_by_user_id',
  })
  createdByUserId: number;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  // Relations

  @ManyToOne(() => User, (user) => user.shipmentHistory)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  creator: User;

}