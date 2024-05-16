import { Platform } from 'src/enums/enum';
import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'announcements' })
export class Announcement {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({
    length: 50,
  })
  version: string;

  @Column({
    length: 100,
  })
  title: string;

  @Column({
    type: 'text'
  })
  description: string;

  @Column({
    name: 'start_date',
    type: 'date',
  })
  startDate: Date;

  @Column({
    name: 'expiry_date',
    type: 'date',
  })
  expiryDate: Date;

  @Column({
    type: 'enum',
    enum: Platform
  })
  platform: Platform;

  @Column({
    type: 'boolean',
    default: true,
  })
  status: boolean;

  @Column({
    name: 'created_by',
  })
  createdBy: number;

  @Column({
    name: 'updated_by',
    nullable: true,
  })
  updatedBy: number;

  @Column({
    name: 'deleted_by',
    nullable: true,
  })
  deletedBy: number;

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

  @Column({
    name: 'deleted_at',
    type: 'datetime',
    nullable: true,
  })
  deletedAt: Date;

}
