import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsOnlyInclude(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'isOnlyInclude',
      target: object.constructor,
      propertyName: propertyName,
      constraints: [property],
      options: validationOptions,
      validator: {
        validate(value: any, args: ValidationArguments) {
          const [relatedValue] = args.constraints;

          let flag = true;
          for (let letter of value) {
            for (let char of relatedValue) {
              if (letter.toLowerCase() === char) {
                flag = true;
                break;
              } else {
                flag = false;
              }
            }
            if (!flag) break;
          }

          return (
            typeof value === 'string' &&
            typeof relatedValue === 'string' &&
            flag
          );
        },
      },
    });
  };
}
