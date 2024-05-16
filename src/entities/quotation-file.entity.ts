import { Quotation } from 'src/entities/quotation.entity';
import { Entity, PrimaryGeneratedColumn, Column, ManyToOne, JoinColumn } from 'typeorm';
import { FileStatus } from '../enums/enum';

@Entity({ name: 't_quotation_files' })
export class QuotationFile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'rfq_number',
  })
  rfqNumber: string;

  @Column({
    name: 'file_container',
  })
  fileContainer: string;

  @Column({
    name: 'file_name',
  })
  fileName: string;

  @Column({
    name: 'original_name',
  })
  originalName: string;

  @Column()
  url: string;

  @Column({
    nullable: true,
  })
  source: string;

  @Column({
    nullable: true,
  })
  platform: string;

  @Column({
    name: 'created_by_user_id',
  })
  createdByUserId: number;

  @Column({
    name: 'company_id',
  })
  companyId: number;

  @Column({
    name: 'created_at',
    type: 'datetime',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @Column({
    name: 'status',
    type: 'boolean',
    default: 1,
  })
  status: boolean;

  @Column({
    name: 'file_status',
  })
  fileStatus?: FileStatus;

  // Relation
  @ManyToOne(() => Quotation, (quotation) => quotation.quotationFiles)
  @JoinColumn({ name: 'rfq_number', referencedColumnName: 'rfqNumber' })
  quotation: Quotation;

}
