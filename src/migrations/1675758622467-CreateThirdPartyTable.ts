import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateThirdPartyTable1675758622467 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      'CREATE TABLE IF NOT EXISTS `m_third_parties` ( \n' +
        '   `id` int(11) NOT NULL AUTO_INCREMENT, \n' +
        '   `company_id` int(11) NOT NULL, \n' +
        '   `created_by_user_id` int(11) NOT NULL, \n' +
        '   `pic_name` varchar(255) NOT NULL, \n' +
        '   `company_name` varchar(255) NOT NULL, \n' +
        '   `currency` varchar(255) NOT NULL, \n' +
        '   `type_of_payment` varchar(255) NOT NULL, \n' +
        '   `phone_code` varchar(255) NOT NULL, \n' +
        '   `phone_number` varchar(255) NOT NULL, \n' +
        '   `email` varchar(255) NOT NULL, \n' +
        '   `business_license` varchar(255) NULL, \n' +
        '   `address` varchar(255) NOT NULL, \n' +
        '   `type` varchar(255) NULL, \n' +
        '   `status` boolean NOT NULL, \n' +
        '   `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \n' +
        '   `updated_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \n' +
        '   PRIMARY KEY (`id`), \n' +
        '   FOREIGN KEY (`company_id`) REFERENCES `c_companies`(`id`) \n' +
        ' ) ENGINE=InnoDB AUTO_INCREMENT=1;\n',
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS `m_third_parties`;');
  }
}
