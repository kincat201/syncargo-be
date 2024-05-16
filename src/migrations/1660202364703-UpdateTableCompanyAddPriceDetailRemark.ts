import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateTableCompanyAddPriceDetailRemark1660202364703 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `c_companies` ADD COLUMN price_detail_remark TEXT NULL DEFAULT NULL AFTER invoice_remark'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `c_companies` DROP COLUMN price_detail_remark'
        );
    }

}
