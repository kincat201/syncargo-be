import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateVendorPriceList1673855103217 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`m_vendor_prices\` (
               \`id\` int(11) NOT NULL AUTO_INCREMENT,
               \`label\` VARCHAR(255) NULL DEFAULT NULL,
               \`vendor_name\` VARCHAR(255) NULL DEFAULT NULL,
               \`shipment_type\` enum('AIRBREAKBULK','AIRCARGO','AIRCOURIER','SEABREAKBULK','SEALCL','SEAFCL') NULL DEFAULT NULL,
               \`country_from\` VARCHAR(255) NULL DEFAULT NULL,
               \`country_from_code\` VARCHAR(100) NULL DEFAULT NULL,
               \`country_from_id\` INT(11) NULL DEFAULT NULL,
               \`city_from\` VARCHAR(255) NULL DEFAULT NULL,
               \`country_to\` VARCHAR(255) NULL DEFAULT NULL,
               \`country_to_code\` VARCHAR(100) NULL DEFAULT NULL,
               \`country_to_id\` INT(11) NULL DEFAULT NULL,
               \`city_to\` VARCHAR(100) NULL DEFAULT NULL,
               \`currency\` VARCHAR(8) NOT NULL DEFAULT 'IDR',
               \`status\` int(11) NOT NULL DEFAULT 1,
               \`company_id\` int(11) NULL DEFAULT NULL,
               \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
               \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
               PRIMARY KEY (\`id\`),
               KEY \`label\` (\`label\`),
               KEY \`vendor_name\` (\`vendor_name\`),
               KEY \`shipment_type\` (\`shipment_type\`),
               KEY \`country_from\` (\`country_from\`),
               KEY \`city_from\` (\`city_from\`),
               KEY \`country_to\` (\`country_to\`),
               KEY \`city_to\` (\`city_to\`),
               KEY \`company_id\` (\`company_id\`),
               KEY \`status\` (\`status\`)
            ) ENGINE=InnoDB AUTO_INCREMENT=1;
          `
        )
        await queryRunner.query(`
            CREATE TABLE IF NOT EXISTS \`m_vendor_price_components\` (
               \`id\` int(11) NOT NULL AUTO_INCREMENT,
               \`uom\` VARCHAR(255) NULL DEFAULT NULL,
               \`profit\` DECIMAL(16,2) NULL DEFAULT NULL,
               \`total\` DECIMAL(16,2) NULL DEFAULT NULL,
               \`note\` VARCHAR(500) NULL DEFAULT NULL,
               \`status\` int(11) NOT NULL DEFAULT 1,
               \`vendor_price_id\` int(11) NOT NULL,
               \`created_at\` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
               \`updated_at\` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
               \`price_comp_name\` VARCHAR(255) NULL DEFAULT NULL,
               \`price\` DECIMAL(16,2) NULL DEFAULT NULL,
               PRIMARY KEY (\`id\`),
               KEY \`vendor_price_id\` (\`vendor_price_id\`),
               KEY \`price_comp_name\` (\`price_comp_name\`),
               KEY \`status\` (\`status\`)
            ) ENGINE=InnoDB AUTO_INCREMENT=1;
        `
        )
        await queryRunner.query(`
            INSERT INTO \`m_menus\` (\`name\`, \`parent_id\`, \`position\`, \`slug\`, \`route\`, \`is_menu\`) VALUES ('Vendor Price', '6', '4', 'vendor-price', '/master-data/vendor-price', '1');
        `
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
