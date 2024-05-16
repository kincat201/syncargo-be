import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateJobSheet1675840172429 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`t_job_sheets\` (
               \`id\` int(11) NOT NULL AUTO_INCREMENT,
               \`job_sheet_number\` VARCHAR(255) NULL DEFAULT NULL,
               \`rfq_number\` VARCHAR(255) NULL DEFAULT NULL,
               \`item_type\` enum('AP','AR','AP|AR') NULL DEFAULT NULL,
               \`ap_status\` JSON NULL DEFAULT NULL,
               \`status\` int(11) NOT NULL DEFAULT 1,
               \`company_id\` int(11) NULL DEFAULT NULL,
               \`affiliation\` VARCHAR(255) NULL DEFAULT NULL,
               \`created_by_user_id\` int(11) NULL DEFAULT NULL,
               \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
               \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
               PRIMARY KEY (\`id\`),
               KEY \`job_sheet_number\` (\`job_sheet_number\`),
               KEY \`rfq_number\` (\`rfq_number\`),
               KEY \`item_type\` (\`item_type\`),
               KEY \`company_id\` (\`company_id\`),
               KEY \`created_by_user_id\` (\`created_by_user_id\`),
               KEY \`status\` (\`status\`)
            ) ENGINE=InnoDB AUTO_INCREMENT=1;
          `
        )
        await queryRunner.query(`
            ALTER TABLE \`t_job_sheets\` ALTER \`ap_status\` SET DEFAULT (JSON_OBJECT());
          `
        )
        await queryRunner.query(`
            ALTER TABLE \`t_job_sheets\` ADD UNIQUE INDEX \`job_sheet_number_uniq\` (\`job_sheet_number\`);
          `
        )
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`t_job_sheet_payables\` (
               \`id\` int(11) NOT NULL AUTO_INCREMENT,
               \`job_sheet_number\` VARCHAR(255) NULL DEFAULT NULL,
               \`vendor_name\` VARCHAR(255) NULL DEFAULT NULL,
               \`payable_date\` VARCHAR(50) NULL DEFAULT NULL,
               \`due_date\` VARCHAR(50) NULL DEFAULT NULL,
               \`ap_status\` enum('WAITING_APPROVAL','APPROVED','PARTIALLY_PAID','PAID','REJECTED') NULL DEFAULT NULL,
               \`note\` TEXT NULL DEFAULT NULL,
               \`amount_due\` JSON NULL DEFAULT NULL,
               \`amount_paid\` JSON NULL DEFAULT NULL,
               \`amount_remaining\` JSON NULL DEFAULT NULL,
               \`status\` int(11) NOT NULL DEFAULT 1,
               \`created_by_user_id\` int(11) NULL DEFAULT NULL,
               \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
               \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
               PRIMARY KEY (\`id\`),
               KEY \`job_sheet_number\` (\`job_sheet_number\`),
               KEY \`vendor_name\` (\`vendor_name\`),
               KEY \`ap_status\` (\`ap_status\`),
               KEY \`created_by_user_id\` (\`created_by_user_id\`),
               KEY \`status\` (\`status\`)
            ) ENGINE=InnoDB AUTO_INCREMENT=1;
          `
        )
        await queryRunner.query(`
            ALTER TABLE \`t_job_sheet_payables\` ALTER \`amount_due\` SET DEFAULT (JSON_OBJECT());
          `
        )
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`t_job_sheet_payable_files\` (
               \`id\` int(11) NOT NULL AUTO_INCREMENT,
               \`job_sheet_payable_id\` int(11) NULL DEFAULT NULL,
               \`file_container\` VARCHAR(255) NULL DEFAULT NULL,
               \`file_name\` VARCHAR(255) NULL DEFAULT NULL,
               \`original_name\` VARCHAR(255) NULL DEFAULT NULL,
               \`url\` VARCHAR(255) NULL DEFAULT NULL,
               \`created_by_user_id\` int(11) NULL DEFAULT NULL,
               \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
               PRIMARY KEY (\`id\`),
               KEY \`job_sheet_payable_id\` (\`job_sheet_payable_id\`),
               KEY \`created_by_user_id\` (\`created_by_user_id\`)
            ) ENGINE=InnoDB AUTO_INCREMENT=1;
          `
        )
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`t_job_sheet_payable_histories\` (
               \`id\` int(11) NOT NULL AUTO_INCREMENT,
               \`job_sheet_payable_id\` int(11) NULL DEFAULT NULL,
               \`action\` enum('CREATED','APPROVED','REJECTED','REVISE') NULL DEFAULT NULL,
               \`details\` TEXT NULL DEFAULT NULL,
               \`status\` int(11) NOT NULL DEFAULT 1,
               \`created_by_user_id\` int(11) NULL DEFAULT NULL,
               \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
               PRIMARY KEY (\`id\`),
               KEY \`job_sheet_payable_id\` (\`job_sheet_payable_id\`),
               KEY \`created_by_user_id\` (\`created_by_user_id\`),
               KEY \`status\` (\`status\`),
               KEY \`action\` (\`action\`)
            ) ENGINE=InnoDB AUTO_INCREMENT=1;
          `
        )
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`t_job_sheet_payable_prices\` (
               \`id\` int(11) NOT NULL AUTO_INCREMENT,
               \`job_sheet_payable_id\` int(11) NULL DEFAULT NULL,
               \`price_component\` VARCHAR(255) NULL DEFAULT NULL,
               \`uom\` VARCHAR(255) NULL DEFAULT NULL,
               \`currency\` VARCHAR(8) NULL DEFAULT 'IDR',
               \`price_amount\` DECIMAL(16,2) NULL DEFAULT 0,
               \`qty\` int(10) NULL DEFAULT 0,
               \`ppn\` double NULL DEFAULT 0,
               \`total_price\` DECIMAL(16,2) NULL DEFAULT 0,
               \`created_by_user_id\` int(11) NULL DEFAULT NULL,
               \`status\` int(11) NOT NULL DEFAULT 1,
               \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
               PRIMARY KEY (\`id\`),
               KEY \`job_sheet_payable_id\` (\`job_sheet_payable_id\`),
               KEY \`created_by_user_id\` (\`created_by_user_id\`),
               KEY \`status\` (\`status\`)
            ) ENGINE=InnoDB AUTO_INCREMENT=1;
          `
        )
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`t_job_sheet_payable_payments\` (
               \`id\` int(11) NOT NULL AUTO_INCREMENT,
               \`job_sheet_payable_id\` int(11) NULL DEFAULT NULL,
               \`currency\` VARCHAR(8) NULL DEFAULT 'IDR',
               \`amount_paid\` DECIMAL(16,2) NULL DEFAULT 0,
               \`payment_date\` VARCHAR(50) DEFAULT NULL,
               \`bank_account\` VARCHAR(255) NULL DEFAULT NULL,
               \`bank_holder\` VARCHAR(255) NULL DEFAULT NULL,
               \`file_container\` VARCHAR(255) NULL DEFAULT NULL,
               \`file_name\` VARCHAR(255) NULL DEFAULT NULL,
               \`original_name\` VARCHAR(255) NULL DEFAULT NULL,
               \`url\` VARCHAR(255) NULL DEFAULT NULL,
               \`created_by_user_id\` int(11) NULL DEFAULT NULL,
               \`status\` int(11) NOT NULL DEFAULT 1,
               \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
               PRIMARY KEY (\`id\`),
               KEY \`job_sheet_payable_id\` (\`job_sheet_payable_id\`),
               KEY \`created_by_user_id\` (\`created_by_user_id\`),
               KEY \`status\` (\`status\`)
            ) ENGINE=InnoDB AUTO_INCREMENT=1;
          `
        )

        await queryRunner.query(`
            INSERT INTO \`m_menus\` (\`name\`, \`position\`,\`icon\`, \`slug\`, \`route\`, \`is_menu\`) VALUES ('Jobsheet', '6','@/assets/icons/sidebar-icons/jobsheet.svg', 'jobsheet', '/jobsheet', '1');
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
