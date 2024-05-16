import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateInvoiceAddInvoiceProcess1661160428164 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_invoices` CHANGE COLUMN `invoice_status` `invoice_status` ENUM(\'PENDING\',\'PROFORMA\',\'ISSUED\',\'SETTLED\') NOT NULL DEFAULT \'PROFORMA\' AFTER `settled_amount`;'
        )
        await queryRunner.query(
          'UPDATE t_invoices SET invoice_status = \'PROFORMA\' WHERE t_invoices.invoice_status = \'PENDING\';'
        )
        await queryRunner.query(
          'ALTER TABLE `t_invoices` ADD COLUMN invoice_process enum(\'TO_BE_ISSUED\',\'WAITING_APPROVAL\',\'NEED_REVISION\',\'OVERDUE\',\'PENDING\',\'WAITING_CONFIRMATION\',\'PARTIALLY_PAID\',\'PAID\') NULL DEFAULT NULL AFTER invoice_status'
        )
        await queryRunner.query(
          'UPDATE t_invoices SET invoice_process = \'TO_BE_ISSUED\' WHERE t_invoices.invoice_status = \'PROFORMA\''
        )
        await queryRunner.query(
          'UPDATE t_invoices SET invoice_process = \'PENDING\' WHERE t_invoices.invoice_status = \'ISSUED\''
        )
        await queryRunner.query(
          'UPDATE t_invoices SET invoice_process = \'PAID\' WHERE t_invoices.invoice_status = \'SETTLED\''
        )
        await queryRunner.query(
          'UPDATE t_invoices SET invoice_process = \'PARTIALLY_PAID\' WHERE t_invoices.settled_amount < t_invoices.remaining_amount'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_invoices` DROP COLUMN invoice_process'
        );
    }

}
