import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdatePaymentHistoryAddRejectNotes1661416174060 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_payment_histories` ADD COLUMN reject_reason text NULL AFTER payment_status'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_payment_histories` DROP COLUMN reject_reason'
        );
    }

}
