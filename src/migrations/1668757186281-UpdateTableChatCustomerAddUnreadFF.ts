import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateTableChatCustomerAddUnreadFF1668757186281 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          `ALTER TABLE \`t_chat_customer\` ADD COLUMN \`unread_message_ff\` INT(11) NULL DEFAULT '0' AFTER \`unread_message\`;`
        )
        await queryRunner.query(
          `ALTER TABLE \`t_chat_room\` ADD COLUMN \`affiliation\` VARCHAR(255) NULL DEFAULT NULL AFTER \`company_id\`;`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
