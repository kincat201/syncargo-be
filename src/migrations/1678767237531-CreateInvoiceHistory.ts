import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateInvoiceHistory1678767237531 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`t_invoice_histories\` (
               \`id\` int(11) NOT NULL AUTO_INCREMENT,
               \`invoice_number\` VARCHAR(255) NULL DEFAULT NULL,
               \`currency\` VARCHAR(8) NULL DEFAULT NULL,
               \`sub_total\` DECIMAL(16,2) NULL DEFAULT 0,
               \`total\` DECIMAL(16,2) NULL DEFAULT 0,
               \`total_currency\` DECIMAL(16,2) NULL DEFAULT 0,
               \`remaining_amount\` DECIMAL(16,2) NULL DEFAULT 0,
               \`remaining_amount_currency\` DECIMAL(16,2) NULL DEFAULT 0,
               \`exchange_rate\` DECIMAL(16,2) NULL DEFAULT 0,
               \`third_party_id\` INT(11) NULL DEFAULT NULL,
               \`default_ppn\` INT(1) NULL DEFAULT 0,
               \`ppn\` DOUBLE NULL DEFAULT 0,
               \`status\` int(1) NULL DEFAULT 1,
               \`status_approval\` ENUM('NEED_APPROVAL','APPROVED','REJECTED') NULL DEFAULT NULL,
               \`created_by_user_id\` int(11) NULL DEFAULT NULL,
               \`approved_by_user_id\` int(11) NULL DEFAULT NULL,
               \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
               \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
               PRIMARY KEY (\`id\`),
               KEY \`invoice_number\` (\`invoice_number\`),
               KEY \`status_approval\` (\`status_approval\`),
               KEY \`status\` (\`status\`)
            ) ENGINE=InnoDB AUTO_INCREMENT=1;
          `
        )

        await queryRunner.query(`
            ALTER TABLE \`t_invoices\`
            ADD COLUMN \`invoice_label\` ENUM('NEED_APPROVAL','CHANGES_REJECTED','REVISED') NULL DEFAULT NULL AFTER \`invoice_process\`,
            ADD COLUMN \`need_approval\` TINYINT(1) NULL DEFAULT 0 AFTER \`paid_currency\`;
          `
        )

        await queryRunner.query(`
          ALTER TABLE \`t_invoices\`
            ADD INDEX \`invoice_label\` (\`invoice_label\`),
            ADD INDEX \`need_approval\` (\`need_approval\`);
          `
        )

        await queryRunner.query(`
          ALTER TABLE \`t_invoice_prices\`
            ADD COLUMN \`invoice_history_id\` INT(11) NULL DEFAULT NULL AFTER \`note\`,
            ADD INDEX \`invoice_history_id\` (\`invoice_history_id\`);
          `
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
