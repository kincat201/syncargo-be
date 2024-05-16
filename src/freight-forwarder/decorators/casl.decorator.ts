import { SetMetadata } from '@nestjs/common';
import { Action } from 'src/enums/enum';
import { Subjects } from 'src/freight-forwarder/casl/casl-ability.factory';

export interface RequiredRule {
  action: Action;
  subject: Subjects;
}

export const CHECK_ABILITY = 'check_ability';

export const CheckAbilities = (...requirements: RequiredRule[]) =>
  SetMetadata(CHECK_ABILITY, requirements);
