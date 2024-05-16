import {MigrationInterface, QueryRunner} from "typeorm";

export class updateShipmentAddContainerNumber1665480282343 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          `ALTER TABLE t_shipments ADD COLUMN \`container_number\` TEXT NULL DEFAULT NULL AFTER \`shipment_selling_price_ppn\`;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_shipments` DROP COLUMN container_number'
        );
    }

}
