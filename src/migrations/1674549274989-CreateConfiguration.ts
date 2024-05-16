import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateConfiguration1674549274989 implements MigrationInterface {
  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `CREATE TABLE IF NOT EXISTS \`m_configurations\` (
      \`key\` VARCHAR(255) NOT NULL,
      \`value\` VARCHAR(255) NULL,
      PRIMARY KEY (\`key\`),
      UNIQUE INDEX \`key_UNIQUE\` (\`key\` ASC) VISIBLE);`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE \`m_configurations\`;`);
  }
}
