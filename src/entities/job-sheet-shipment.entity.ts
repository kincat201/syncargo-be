import { ManyToOne, Entity, PrimaryGeneratedColumn, Column, JoinColumn, OneToMany, OneToOne } from 'typeorm';
import { User } from './user.entity';
import { JobSheet } from './job-sheet.entity';
import { ShipmentService, ShipmentVia } from '../enums/enum';

@Entity({ name: 't_job_sheet_shipments' })
export class JobSheetShipment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'job_sheet_number',
  })
  jobSheetNumber: string;

  @Column({
    name: 'company_id',
  })
  companyId: number;

  @Column({
    name: 'shipment_via',
    type: 'enum',
    enum: ShipmentVia,
    nullable: true,
  })
  shipmentVia: ShipmentVia;

  @Column({
    name: 'shipment_service',
    type: 'enum',
    enum: ShipmentService,
    nullable: true,
  })
  shipmentService: ShipmentService;

  @Column({
    name: 'country_from',
    nullable: true,
  })
  countryFrom: string;

  @Column({
    name: 'country_from_code',
    nullable: true,
  })
  countryFromCode: string;

  @Column({
    name: 'country_from_id',
    nullable: true,
  })
  countryFromId: number;

  @Column({
    name: 'city_from',
    nullable: true,
  })
  cityFrom: string;

  @Column({
    name: 'port_of_loading',
    nullable: true,
  })
  portOfLoading: string;

  @Column({
    name: 'country_to',
    nullable: true,
  })
  countryTo: string;

  @Column({
    name: 'country_to_code',
    nullable: true,
  })
  countryToCode: string;

  @Column({
    name: 'country_to_id',
    nullable: true,
  })
  countryToId: number;

  @Column({
    name: 'city_to',
    nullable: true,
  })
  cityTo: string;

  @Column({
    name: 'port_of_discharge',
    nullable: true,
  })
  portOfDischarge: string;

  @Column({
    nullable: true,
  })
  remarks: string;
  
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

  @Column({
    name: 'updated_at',
    type: 'datetime',
    onUpdate: 'CURRENT_TIMESTAMP',
    default: () => 'CURRENT_TIMESTAMP',
  })
  updatedAt: Date;

  // Relations // TODO: fix relation with rfqNumber

  @ManyToOne(() => User, (user) => user.quotations)
  @JoinColumn([{ name: 'created_by_user_id', referencedColumnName: 'userId' }])
  user: User;

  @OneToOne(() => JobSheet, (jobSheet) => jobSheet.jobSheetShipment)
  @JoinColumn([{ name: 'job_sheet_number', referencedColumnName: 'jobSheetNumber' }])
  jobSheet: JobSheet;
}