import {MigrationInterface, QueryRunner} from "typeorm";

export class InsertDummyDataFreeTrial1674709460398 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
          `ALTER TABLE \`c_companies\` \tADD COLUMN \`is_trial\` TINYINT(3) NOT NULL DEFAULT '0' AFTER \`hbl_field\`;`
        )
        await queryRunner.query(
          `INSERT INTO \`c_companies\` (\`name\`, \`address\`, \`email\`, \`phone_code\`, \`phone_number\`, \`npwp\`, \`logo\`, \`affiliation\`, \`subdomain\`, \`customer_subdomain\`, \`created_at\`, \`updated_at\`) VALUES ('Dummy Company', 'Dummy Address', 'dummy@gmail.com', '62', '9999999999', '99.999.999.1-222.999', 'https://demo-files.syncargo.com/saas/ffc87d75c20818df7e7c22c3d3a7051ae0af413b9cee499240a37a5135ac8d8d.blob', 'DUMMY', 'dummy', 'dummy-customer', '2023-01-26 12:11:10', '2023-01-26 12:11:10');`
        )
        await queryRunner.query(
          `INSERT INTO \`t_subscription_histories\` (\`company_id\`, \`type\`, \`active_date\`, \`expiry_date\`, \`duration\`, \`created_by_user_id\`, \`created_at\`) VALUES ('106', 'Free Trial', '2023-01-05', '2030-12-31', '2917', '61', '2023-01-05 15:20:30');`
        )
        await queryRunner.query(
          `INSERT INTO \`c_customers\` (\`company_name\`, \`full_name\`, \`email\`, \`phone_code\`, \`phone_number\`, \`customer_id\`, \`customer_type\`, \`address\`, \`created_at\`, \`updated_at\`, \`affiliation\`, \`npwp\`, \`company_id\`, \`type_of_payment\`, \`activation_code\`) VALUES ('Dummy Company', 'Dummy Customer', 'dummy@andalin.com', '62', '9999999999', '0001-9999999', 'Individual', 'dummy address', '2023-01-26 12:15:17', '2023-01-26 12:15:18', 'DUMMY', '99.999.9999.9-999.999', '106', 'Cash', '-');`
        )
        await queryRunner.query(
          `INSERT INTO \`c_users\` (\`full_name\`, \`email\`, \`password\`, \`phone_code\`, \`phone_number\`, \`role\`, \`photo\`, \`affiliation\`, \`updated_at\`, \`created_at\`, \`company_id\`, \`user_status\`, \`created_by\`, \`division_name\`) VALUES ('dummy user', 'dummy@andalin.com', '$2b$10$42WxYmbt46QhfMtCQnNZqOig5pwpf79fN1x31pA4671ohDdzVtIfm', '00', '11100', 'admin', 'https://demo-files.syncargo.com/saas/a1ffa0744ad4d2f318f7060a61f169633f0984dfa5b12890fbc07fc8f434a578.png', 'DUMMY', '2023-01-26 13:57:35', '2023-01-26 13:57:49', '106', 'USERVERIFICATION', 'SELF', 'dummy');`
        )
        await queryRunner.query(
          `INSERT INTO m_access_menu_companies (company_id,menu_id) SELECT 106 as company_id, m_menus.id AS menu_id FROM m_menus;`
        )
        await queryRunner.query(
          `INSERT INTO m_access_menu_users (user_id,menu_id) SELECT c_users.id AS user_id, menu_id FROM m_access_menu_companies RIGHT JOIN c_users ON c_users.company_id = m_access_menu_companies.company_id WHERE m_access_menu_companies.company_id = 106 AND c_users.role = 'admin';`
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
    }

}
