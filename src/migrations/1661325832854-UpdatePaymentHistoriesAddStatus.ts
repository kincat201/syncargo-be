import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdatePaymentHistoriesAddStatus1661325832854 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_payment_histories` ADD COLUMN payment_status enum(\'WAITING_CONFIRMATION\',\'CONFIRMED\',\'PAID\') NULL DEFAULT NULL AFTER url'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_payment_histories` DROP COLUMN payment_status'
        );
    }

}
