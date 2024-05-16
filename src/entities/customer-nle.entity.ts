import { Entity, PrimaryGeneratedColumn, Column, OneToMany, ManyToOne, JoinColumn } from 'typeorm';
import { Customer } from './customer.entity';

@Entity({ name: 'c_customer_nles' })
export class CustomerNle {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'customer_id',
    nullable: true,
  })
  customerId: string;

  @Column({
    name: 'company_id',
  })
  companyId: number;

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

  // Relation
  @ManyToOne(() => Customer, (customer) => customer.customerNle)
  @JoinColumn({ name: 'customer_id', referencedColumnName: 'customerId' })
  customer: Customer;

}
