import {MigrationInterface, QueryRunner} from "typeorm";

export class CreateInvoiceRejectLog1661332702617 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'CREATE TABLE IF NOT EXISTS `t_invoice_reject_logs` (\n' +
          '  `id` int(11) NOT NULL AUTO_INCREMENT,\n' +
          '  `invoice_number` varchar(255) NOT NULL,\n' +
          '  `reject_date` date DEFAULT NULL,\n' +
          '  `invoice_date` date DEFAULT NULL,\n' +
          '  `reason` text,\n' +
          '  `status` int(11) NOT NULL DEFAULT \'1\',\n' +
          '  `created_by_user_id` int(11) NOT NULL,\n' +
          '  `created_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,\n' +
          '  PRIMARY KEY (`id`),\n' +
          '  KEY `invoice_number` (`invoice_number`),\n' +
          '  KEY `status` (`status`)\n' +
          ') ENGINE=InnoDB AUTO_INCREMENT=1;\n'
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          'DROP TABLE `t_invoice_reject_logs`'
        )
    }

}
