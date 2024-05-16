import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateChatCustomer1661923089732 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'CREATE TABLE `t_chat_customer` (\n' +
          '`id` BIGINT NOT NULL AUTO_INCREMENT,\n' +
          '`customer_id` VARCHAR(255) NULL DEFAULT NULL,\n' +
          '`company_id` INT(11) NULL DEFAULT NULL,\n' +
          '`unread_message` INT(11) NULL DEFAULT 0,\n' +
          '`status` INT(1) NULL DEFAULT 1,\n' +
          '`created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,\n' +
          '`updated_at` TIMESTAMP NULL DEFAULT NULL,\n' +
          'INDEX `customer_id` (`customer_id`),\n' +
          'INDEX `company_id` (`company_id`),\n' +
          'PRIMARY KEY (`id`) );'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'DROP TABLE `t_chat_customer`'
        )
    }

}
