import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateFailedbyCompanyIdQuotation1668574120056 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          `ALTER TABLE \`t_bids\` ADD COLUMN \`failed_by_company_id\` INT(11) NULL DEFAULT NULL AFTER \`updated_by_user_id\`;`
        )
        await queryRunner.query(
          `ALTER TABLE \`t_quotation_files\`
            ADD COLUMN \`company_id\` INT(11) NOT NULL AFTER \`created_by_user_id\`,
            ADD INDEX \`company_id\` (\`company_id\`);
           `
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
