import {MigrationInterface, QueryRunner} from "typeorm";

export class InsertMenuNLE1668591115072 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            INSERT INTO \`m_menus\` (\`id\`, \`name\`, \`position\`,\`icon\`, \`slug\`, \`route\`, \`is_menu\`) VALUES ('4', 'Quotation NLE', '3','@/assets/icons/sidebar-icons/document-text.svg', 'quotation-nle', '/quotation-nle', '1');
        `)
        await queryRunner.query(`
            INSERT INTO \`m_menus\` (\`name\`, \`parent_id\`, \`position\`, \`slug\`, \`route\`, \`is_menu\`) VALUES ('Customer NLE', '6', '1', 'customer-nle', '/master-data/customer-nle', '1');
        `)
        await queryRunner.query(`
            INSERT INTO \`m_access_menu_companies\` (\`company_id\`, \`menu_id\`) VALUES ('4', '4');
        `)
        await queryRunner.query(`
            INSERT INTO \`m_access_menu_companies\` (\`company_id\`, \`menu_id\`) VALUES ('4', '42');
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
