import { Entity, PrimaryGeneratedColumn, Column } from 'typeorm';

@Entity({ name: 'm_kind_of_goods' })
export class KindOfGoods {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    name: 'product_type'
  })
  productType: string;

}
