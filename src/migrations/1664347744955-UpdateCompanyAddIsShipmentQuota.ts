import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateCompanyAddIsShipmentQuota1664347744955 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          `ALTER TABLE c_companies ADD COLUMN \`shipment_quota_unlimited\` TINYINT(1) NULL DEFAULT 0 AFTER \`shipment_quota\`;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `c_companies` DROP COLUMN shipment_quota_unlimited'
        );
    }

}
