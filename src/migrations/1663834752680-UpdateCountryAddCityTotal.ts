import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateCountryAddCityTotal1663834752680 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          `ALTER TABLE \`m_countries\` ADD COLUMN city_total int(10) NULL DEFAULT 0 AFTER company_id;`
        )

        await queryRunner.query(
          `UPDATE m_countries mc JOIN ( SELECT SUM(IF(m_origin_destination.status = 1, 1, 0)) AS total, m_origin_destination.country_code, m_origin_destination.company_id 
          FROM m_origin_destination GROUP BY m_origin_destination.country_code ) mo ON 
          mo.company_id = mc.company_id AND mo.country_code = mc.country_code SET mc.city_total = mo.total;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `m_countries` DROP COLUMN city_total'
        )
    }

}
