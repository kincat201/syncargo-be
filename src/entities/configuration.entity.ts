import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ name: 'm_configurations' })
export class Configuration {
  @PrimaryColumn({ name: 'key', unique: true, nullable: false })
  key: string;

  @Column({ name: 'value' })
  value: string;
}
