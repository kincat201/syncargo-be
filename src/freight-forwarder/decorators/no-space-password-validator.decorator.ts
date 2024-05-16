import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsNoSpace(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isNoSpace',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedValue] = args.constraints;
          return (
            typeof value === 'string' &&
            typeof relatedValue === 'string' &&
            !value?.includes(relatedValue)
          );
        },
      },
    });
  };
}
