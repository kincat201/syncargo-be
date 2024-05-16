import {MigrationInterface, QueryRunner} from "typeorm";

export class updateShipmentOtifChangeShippingNumber1666154759837 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          `ALTER TABLE \`t_shipment_otifs\` CHANGE COLUMN \`shipping_number\` \`shipping_number\` VARCHAR(255) NULL DEFAULT NULL AFTER \`shipping_line\`;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        /*await queryRunner.query(
          'ALTER TABLE `t_shipment_otifs` DROP COLUMN shipping_number'
        );*/
    }

}
