import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateTableCompanyAddInvoiceRemark1660202346023 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `c_companies` ADD COLUMN invoice_remark TEXT NULL DEFAULT NULL AFTER quotation_notes'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `c_companies` DROP COLUMN invoice_remark'
        )
    }

}
