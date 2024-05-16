import {MigrationInterface, QueryRunner} from "typeorm";

export class UpdateShipmentCeisa1680073413500 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE \`t_shipments\`
            \tADD COLUMN \`is_ceisa\` TINYINT(1) NULL DEFAULT 0 AFTER \`bl_place_of_delivery\`,
            \tADD COLUMN \`ceisa_field\` JSON NULL AFTER \`is_ceisa\`,
            \tADD INDEX \`is_ceisa\` (\`is_ceisa\`);
          `
        )

        await queryRunner.query(`
            ALTER TABLE \`t_shipments\` ALTER \`ceisa_field\` SET DEFAULT (JSON_OBJECT());
          `
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
