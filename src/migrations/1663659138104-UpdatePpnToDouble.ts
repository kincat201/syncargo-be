import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdatePpnToDouble1663659138104 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_invoices` CHANGE COLUMN `ppn` `ppn` DOUBLE NOT NULL DEFAULT 0 AFTER `remaining_amount`;'
        )
        await queryRunner.query(
          'ALTER TABLE `t_shipments` CHANGE COLUMN `shipment_selling_price_ppn` `shipment_selling_price_ppn` DOUBLE NOT NULL DEFAULT 0 AFTER `created_by_company_id`;'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'ALTER TABLE `t_invoices` DROP COLUMN ppn'
        );
        await queryRunner.query(
          'ALTER TABLE `t_shipments` DROP COLUMN shipment_selling_price_ppn'
        );
    }

}
