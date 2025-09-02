import { Knex } from 'knex';
import { Provider, ProviderStatus } from '@iam-fileserver/shared';
import { Database } from '../database/database';

export class ProviderRepository {
  private db: Knex;

  constructor() {
    this.db = Database.getInstance().getKnex();
  }

  async create(provider: Provider): Promise<Provider> {
    const providerData = {
      id: provider.id,
      name: provider.name,
      description: provider.description,
      enabled: provider.enabled,
      last_check: provider.lastCheck,
      status: provider.status,
      config: JSON.stringify(provider.config)
    };

    await this.db('providers').insert(providerData);
    const created = await this.findById(provider.id);
    if (!created) {
      throw new Error(`Failed to create provider with id: ${provider.id}`);
    }
    return created;
  }

  async findById(id: string): Promise<Provider | null> {
    const row = await this.db('providers').where({ id }).first();
    if (!row) return null;
    return this.mapRowToProvider(row);
  }

  async findAll(): Promise<Provider[]> {
    const rows = await this.db('providers').orderBy('name');
    return rows.map(row => this.mapRowToProvider(row));
  }

  async findEnabled(): Promise<Provider[]> {
    const rows = await this.db('providers')
      .where('enabled', true)
      .orderBy('name');
    return rows.map(row => this.mapRowToProvider(row));
  }

  async update(id: string, updates: Partial<Provider>): Promise<Provider | null> {
    const updateData: any = {};
    
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.enabled !== undefined) updateData.enabled = updates.enabled;
    if (updates.lastCheck !== undefined) updateData.last_check = updates.lastCheck;
    if (updates.status !== undefined) updateData.status = updates.status;
    if (updates.config !== undefined) updateData.config = JSON.stringify(updates.config);
    
    updateData.updated_at = new Date();

    await this.db('providers').where({ id }).update(updateData);
    return this.findById(id);
  }

  async updateStatus(id: string, status: ProviderStatus, lastCheck?: Date): Promise<void> {
    const updateData: any = { status };
    if (lastCheck) {
      updateData.last_check = lastCheck;
    }
    updateData.updated_at = new Date();

    await this.db('providers').where({ id }).update(updateData);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db('providers').where({ id }).del();
    return deleted > 0;
  }

  async exists(id: string): Promise<boolean> {
    const result = await this.db('providers')
      .where({ id })
      .select('id')
      .first();
    return !!result;
  }

  private mapRowToProvider(row: any): Provider {
    return {
      id: row.id,
      name: row.name,
      description: row.description,
      enabled: Boolean(row.enabled),
      lastCheck: row.last_check ? new Date(row.last_check) : undefined,
      status: row.status as ProviderStatus,
      config: row.config ? JSON.parse(row.config) : {}
    };
  }
}
