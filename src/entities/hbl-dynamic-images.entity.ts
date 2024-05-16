import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm'

@Entity({ name: 't_hbl_dynamic_images' })
export class HblDynamicImages {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    name: 'company_id',
  })
  companyId: number;

  // file

  @Column({
    name: 'file_container',
    nullable: true,
  })
  fileContainer: string;

  @Column({
    name: 'file_name',
    nullable: true,
  })
  fileName: string;

  @Column({
    name: 'original_name',
    nullable: true,
  })
  originalName: string;

  @Column({
    nullable: true,
  })
  url: string;

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

}