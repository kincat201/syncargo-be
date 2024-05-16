import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateCompanyAddShipmentQuota1661322372406 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `c_companies` ADD COLUMN shipment_quota int(11) NULL DEFAULT 0 AFTER customer_module'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `c_companies` DROP COLUMN shipment_quota'
        );
    }

}
