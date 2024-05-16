import { Injectable } from '@nestjs/common';
import { Action, Role } from 'src/enums/enum';
import { User } from 'src/entities/user.entity';
import {
  Ability,
  AbilityBuilder,
  AbilityClass,
  InferSubjects,
  ExtractSubjectType,
} from '@casl/ability';

export type Subjects = InferSubjects<typeof User> | 'all';

export type AppAbility = Ability<[Action, Subjects]>;

@Injectable()
export class CaslAbilityFactory {
  defineAbility(user: User) {
    const { can, cannot, build } = new AbilityBuilder(
      Ability as AbilityClass<AppAbility>,
    );
    if (user.role === Role.ADMIN) {
      can(Action.MANAGE, 'all');
    } else {
      can(Action.READ, User);
      cannot(Action.CREATE, User).because(
        'Only admins are allowed to do this.',
      );
    }
    return build({
      detectSubjectType: (item) =>
        item.constructor as ExtractSubjectType<Subjects>,
    });
  }
}
