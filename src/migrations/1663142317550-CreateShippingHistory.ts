import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateShippingHistory1663142317550 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'CREATE TABLE IF NOT EXISTS `t_shipment_histories` ( \n' +
          '   `id` int(11) NOT NULL AUTO_INCREMENT, \n' +
          '   `rfq_number` varchar(255) NOT NULL, \n' +
          '   `description` TEXT NULL, \n' +
          '   `details` TEXT NULL, \n' +
          '   `status` int(11) NOT NULL DEFAULT 1, \n' +
          '   `created_by_user_id` int(11) NOT NULL, \n' +
          '   `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP, \n' +
          '   PRIMARY KEY (`id`), \n' +
          '   KEY `rfq_number` (`rfq_number`), \n' +
          '   KEY `created_by_user_id` (`created_by_user_id`), \n' +
          '   KEY `status` (`status`) \n' +
          ' ) ENGINE=InnoDB AUTO_INCREMENT=1;\n'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'DROP TABLE `t_shipment_histories`'
        )
    }

}
