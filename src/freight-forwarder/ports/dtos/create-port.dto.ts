import { IsString, IsIn } from 'class-validator';
import { ShipmentVia } from 'src/enums/enum';

export class CreatePortDto {
  @IsString()
  countryCode: string;

  @IsIn(Object.values(ShipmentVia))
  portType: ShipmentVia;

  @IsString()
  portName: string;
}
