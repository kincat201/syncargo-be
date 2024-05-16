import { Ability } from '@casl/ability';
import { Module } from '@nestjs/common';
import { CaslAbilityFactory } from './casl-ability.factory';
@Module({
  providers: [CaslAbilityFactory],
  exports: [CaslAbilityFactory],
})
export class CaslModule {}
