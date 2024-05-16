import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateChatRoom1661923106514 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'CREATE TABLE `t_chat_room` ( '+
           '    `id` BIGINT NOT NULL AUTO_INCREMENT,'+
           '   `customer_id` VARCHAR(50) NULL DEFAULT NULL,'+
           '   `company_id` INT NULL DEFAULT NULL,'+
           '   `rfq_number` VARCHAR(255) NULL DEFAULT NULL,'+
           '   `types` ENUM("GENERAL","QUOTATION") NULL DEFAULT NULL,'+
           '   `unread_message_customer` INT NULL DEFAULT 0,'+
           '   `unread_message_ff` INT NULL DEFAULT 0,'+
           '   `last_message` TEXT NULL,'+
           '   `status` TINYINT(1) NULL DEFAULT 1,'+
           '   `created_at` TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,'+
           '   `updated_at` TIMESTAMP NULL DEFAULT NULL,'+
           '   INDEX `customer_id` (`customer_id`),'+
           '   INDEX `company_id` (`company_id`),'+
           '   INDEX `rfq_number` (`rfq_number`),'+
           '   INDEX `unread_message_customer` (`unread_message_customer`),'+
           '   INDEX `unread_message_ff` (`unread_message_ff`),'+
           '   PRIMARY KEY (`id`));'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'DROP TABLE `t_chat_customer`'
        )
    }

}
