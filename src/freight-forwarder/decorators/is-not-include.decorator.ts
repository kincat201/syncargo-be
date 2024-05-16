import {
  registerDecorator,
  ValidationOptions,
  ValidationArguments,
} from 'class-validator';

export function IsNotInclude(
  property: string,
  validationOptions?: ValidationOptions,
) {
  return function (object: Object, propertyName: string) {
    registerDecorator({
      name: 'IsNotInclude',
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
              if (letter === char) {
                flag = true;
                break;
              } else {
                flag = false;
              }
            }
            if (flag === true) break;
          }

          return (
            typeof value === 'string' &&
            typeof relatedValue === 'string' &&
            !flag
          );
        },
      },
    });
  };
}
