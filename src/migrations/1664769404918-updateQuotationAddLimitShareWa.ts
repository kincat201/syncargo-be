import {MigrationInterface, QueryRunner} from "typeorm";

export class updateQuotationAddLimitShareWa1664769404918 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          `ALTER TABLE \`t_quotations\`
                \tADD COLUMN \`limit_wa_ff\` INT(1) NULL DEFAULT 2 AFTER \`failed_by_company_id\`,
                \tADD COLUMN \`limit_wa_customer\` INT(1) NULL DEFAULT 1 AFTER \`limit_wa_ff\`;
            `
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_quotations` DROP COLUMN limit_wa_ff'
        );
        await queryRunner.query(
          'ALTER TABLE `t_quotations` DROP COLUMN limit_wa_customer'
        );
    }

}
