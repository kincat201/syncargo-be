import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { Quotation } from './quotation.entity';

@Entity({ name: 't_quotation_nle_companies' })
export class QuotationNleCompany {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'rfq_number',
  })
  rfqNumber: string;

  @Column({
    name: 'company_id',
    nullable: true,
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
  @ManyToOne(() => Quotation, (quotation) => quotation.quotationFiles)
  @JoinColumn({ name: 'rfq_number', referencedColumnName: 'rfqNumber' })
  quotation: Quotation;

}
