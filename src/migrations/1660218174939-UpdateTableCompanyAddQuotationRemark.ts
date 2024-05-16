import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateTableCompanyAddQuotationRemark1660218174939 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `c_companies` ADD COLUMN quotation_remark TEXT NULL DEFAULT NULL AFTER quotation_notes'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `c_companies` DROP COLUMN quotation_remark'
        );
    }

}
