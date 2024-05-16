import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateShipmentAndInvoiceAddPpn1660803340750 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_shipments` ADD COLUMN `shipment_selling_price_ppn` DOUBLE NOT NULL DEFAULT 0 AFTER `consignee_phone_code`;'
        );
        await queryRunner.query(
          'ALTER TABLE `t_invoices` ADD COLUMN `ppn` DOUBLE NULL DEFAULT 0 AFTER `remaining_amount`;'
        );
        await queryRunner.query(
          'ALTER TABLE `t_shipment_selling_prices` DROP COLUMN `ppn`;'
        );
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_shipments` DROP COLUMN shipment_selling_price_ppn'
        );
        await queryRunner.query(
          'ALTER TABLE `t_invoices` DROP COLUMN ppn'
        );
    }

}
