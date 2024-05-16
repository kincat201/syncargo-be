import { Quotation } from 'src/entities/quotation.entity';
import { User } from 'src/entities/user.entity';
import { PaymentAdvice } from 'src/entities/payment-advice.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  OneToMany,
  OneToOne,
  ManyToOne,
  JoinColumn,
  JoinTable,
  ManyToMany,
} from 'typeorm';
import { Company } from 'src/entities/company.entity';
import { Features } from './features.entity';

@Entity({ name: 'm_menus' })
export class Menu {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  name: string;

  @Column({
    name: 'parent_id',
    nullable: true,
  })
  parentId: number;

  @Column({
    name: 'position',
  })
  position: number;

  @Column({
    name: 'icon',
    default: null,
    nullable: true,
  })
  icon: string;

  @Column({
    name: 'slug',
    default: null,
    nullable: true,
  })
  slug: string;

  @Column({
    name: 'route',
    default: null,
    nullable: true,
  })
  route: string;

  @Column({
    name: 'is_menu',
    default: false,
    type: 'boolean',
  })
  isMenu: boolean;

  // @Column({
  //   name: 'is_submenu',
  //   default: false,
  //   type: 'boolean'
  // })
  // isSubmenu: boolean;

  // Relations
  @OneToMany(() => Menu, (menu) => menu.parent)
  children: Menu[];

  @ManyToOne(() => Menu, (menu) => menu.children)
  @JoinColumn({ name: 'parent_id', referencedColumnName: 'id' })
  parent: Menu;

  @ManyToMany(() => Company)
  companies: Company[];

  @ManyToMany(() => User)
  users: User[];

  @ManyToMany(() => Features)
  @JoinTable({
    name: 'm_access_menu_features',
    joinColumn: {
      name: 'menu_id',
      referencedColumnName: 'id',
    },
    inverseJoinColumn: {
      name: 'feature_id',
      referencedColumnName: 'id',
    },
  })
  feature: Features[];
}
