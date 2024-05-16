import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateTableQuotationAddCountryCodeAndId1662000315008 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_quotations` ADD COLUMN country_from_code VARCHAR(10) NULL DEFAULT NULL AFTER country_from;'
        )
        await queryRunner.query(
          'ALTER TABLE `t_quotations` ADD COLUMN country_to_code VARCHAR(10) NULL DEFAULT NULL AFTER country_to;'
        )
        await queryRunner.query(
          'ALTER TABLE `t_quotations` ADD COLUMN country_from_id INT(10) NULL DEFAULT NULL AFTER country_from;'
        )
        await queryRunner.query(
          'ALTER TABLE `t_quotations` ADD COLUMN country_to_id INT(10) NULL DEFAULT NULL AFTER country_to;'
        )
        await queryRunner.query(
          'ALTER TABLE `t_quotations` ADD INDEX `country_to_id` (`country_to_id`), ADD INDEX `country_from_id` (`country_from_id`);'
        )
        await queryRunner.query(
          'UPDATE t_quotations JOIN m_countries ON m_countries.country_name = t_quotations.country_from SET t_quotations.country_from_code = m_countries.country_code, t_quotations.country_from_id = m_countries.id;'
        )
        await queryRunner.query(
          'UPDATE t_quotations JOIN m_countries ON m_countries.country_name = t_quotations.country_to SET t_quotations.country_to_code = m_countries.country_code, t_quotations.country_to_id = m_countries.id;'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_quotations` DROP COLUMN country_from_code'
        )
        await queryRunner.query(
          'ALTER TABLE `t_quotations` DROP COLUMN country_to_code'
        )
        await queryRunner.query(
          'ALTER TABLE `t_quotations` DROP COLUMN country_from_id'
        )
        await queryRunner.query(
          'ALTER TABLE `t_quotations` DROP COLUMN country_to_id'
        )
    }

}
