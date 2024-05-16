import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'm_fcl_types' })
export class FclType {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column()
  code: string;

}
