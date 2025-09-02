import knex, { Knex } from 'knex';
import path from 'path';
import fs from 'fs-extra';

export class Database {
  private static instance: Database;
  private knex: Knex;

  private constructor() {
    // Ensure database directory exists
    const dbPath = process.env.DATABASE_PATH || './data';
    fs.ensureDirSync(dbPath);

    this.knex = knex({
      client: 'sqlite3',
      connection: {
        filename: path.join(dbPath, 'fileserver.db')
      },
      useNullAsDefault: true,
      migrations: {
        directory: './migrations'
      }
    });
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  public getKnex(): Knex {
    return this.knex;
  }

  public async initialize(): Promise<void> {
    await this.runMigrations();
  }

  private async runMigrations(): Promise<void> {
    // Create tables if they don't exist
    await this.createProvidersTable();
    await this.createDownloadsTable();
    await this.createCategoriesTable();
  }

  private async createProvidersTable(): Promise<void> {
    const hasTable = await this.knex.schema.hasTable('providers');
    if (!hasTable) {
      await this.knex.schema.createTable('providers', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.boolean('enabled').defaultTo(true);
        table.datetime('last_check');
        table.string('status').defaultTo('disabled');
        table.json('config');
        table.timestamps(true, true);
      });
    }
  }

  private async createDownloadsTable(): Promise<void> {
    const hasTable = await this.knex.schema.hasTable('downloads');
    if (!hasTable) {
      await this.knex.schema.createTable('downloads', (table) => {
        table.string('id').primary();
        table.string('provider_id').references('id').inTable('providers');
        table.string('category').notNullable();
        table.string('title').notNullable();
        table.text('description');
        table.string('version').notNullable();
        table.string('file_name').notNullable();
        table.string('file_path').notNullable();
        table.bigInteger('file_size').notNullable();
        table.datetime('downloaded_at').notNullable();
        table.string('url');
        table.string('checksum');
        table.json('tags');
        table.json('metadata');
        table.timestamps(true, true);
        table.index(['provider_id', 'category']);
        table.index(['downloaded_at']);
      });
    }
  }

  private async createCategoriesTable(): Promise<void> {
    const hasTable = await this.knex.schema.hasTable('categories');
    if (!hasTable) {
      await this.knex.schema.createTable('categories', (table) => {
        table.string('id').primary();
        table.string('name').notNullable();
        table.text('description');
        table.string('provider_id').references('id').inTable('providers');
        table.integer('item_count').defaultTo(0);
        table.timestamps(true, true);
      });
    }
  }

  public async close(): Promise<void> {
    await this.knex.destroy();
  }
}
