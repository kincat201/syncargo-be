import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateTableQuotationFilesAddSources1663752411484 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_quotation_files` ADD COLUMN source VARCHAR(20) NULL DEFAULT \'QUOTATION\' AFTER url;'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_quotation_files` DROP COLUMN source'
        )
    }

}
