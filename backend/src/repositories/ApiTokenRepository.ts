import { Database } from '../database/database';
import { Knex } from 'knex';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface ApiToken {
  id: string;
  name: string;
  token: string;
  description?: string;
  created_by: string;
  is_active: boolean;
  last_used_at?: Date;
  expires_at?: Date;
  created_at: Date;
  updated_at: Date;
  creator?: {
    id: string;
    name: string;
    email: string;
  };
}

export interface CreateApiTokenData {
  name: string;
  description?: string;
  created_by: string;
  expires_at?: Date;
}

export interface UpdateApiTokenData {
  name?: string;
  description?: string;
  is_active?: boolean;
  expires_at?: Date;
}

export class ApiTokenRepository {
  private knex: Knex;

  constructor() {
    this.knex = Database.getInstance().getKnex();
  }

  async findAll(): Promise<ApiToken[]> {
    const tokens = await this.knex('api_tokens')
      .leftJoin('users', 'api_tokens.created_by', 'users.id')
      .select(
        'api_tokens.*',
        'users.name as creator_name',
        'users.email as creator_email'
      )
      .orderBy('api_tokens.created_at', 'desc');

    return tokens.map(this.mapToken);
  }

  async findById(id: string): Promise<ApiToken | null> {
    const token = await this.knex('api_tokens')
      .leftJoin('users', 'api_tokens.created_by', 'users.id')
      .select(
        'api_tokens.*',
        'users.name as creator_name',
        'users.email as creator_email'
      )
      .where('api_tokens.id', id)
      .first();

    return token ? this.mapToken(token) : null;
  }

  async findByToken(tokenString: string): Promise<ApiToken | null> {
    const token = await this.knex('api_tokens')
      .leftJoin('users', 'api_tokens.created_by', 'users.id')
      .select(
        'api_tokens.*',
        'users.name as creator_name',
        'users.email as creator_email'
      )
      .where('api_tokens.token', tokenString)
      .where('api_tokens.is_active', true)
      .first();

    if (!token) {
      return null;
    }

    // Check if token is expired
    if (token.expires_at && new Date(token.expires_at) < new Date()) {
      return null;
    }

    return this.mapToken(token);
  }

  async create(tokenData: CreateApiTokenData): Promise<ApiToken> {
    const id = uuidv4();
    const token = this.generateSecureToken();
    
    const tokenToInsert = {
      id,
      name: tokenData.name,
      token,
      description: tokenData.description || null,
      created_by: tokenData.created_by,
      is_active: true,
      expires_at: tokenData.expires_at || null,
      created_at: new Date(),
      updated_at: new Date()
    };

    await this.knex('api_tokens').insert(tokenToInsert);
    
    const createdToken = await this.findById(id);
    if (!createdToken) {
      throw new Error('Failed to create API token');
    }
    
    return createdToken;
  }

  async update(id: string, tokenData: UpdateApiTokenData): Promise<ApiToken | null> {
    const updateData: any = {
      updated_at: new Date()
    };

    if (tokenData.name) updateData.name = tokenData.name;
    if (tokenData.description !== undefined) updateData.description = tokenData.description;
    if (tokenData.is_active !== undefined) updateData.is_active = tokenData.is_active;
    if (tokenData.expires_at !== undefined) updateData.expires_at = tokenData.expires_at;

    const updatedCount = await this.knex('api_tokens')
      .where('id', id)
      .update(updateData);

    if (updatedCount === 0) {
      return null;
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const deletedCount = await this.knex('api_tokens')
      .where('id', id)
      .del();

    return deletedCount > 0;
  }

  async updateLastUsed(tokenString: string): Promise<void> {
    await this.knex('api_tokens')
      .where('token', tokenString)
      .update({
        last_used_at: new Date(),
        updated_at: new Date()
      });
  }

  async count(): Promise<number> {
    const result = await this.knex('api_tokens').count('id as count').first();
    return result?.count as number || 0;
  }

  async countActive(): Promise<number> {
    const result = await this.knex('api_tokens')
      .where('is_active', true)
      .count('id as count')
      .first();
    return result?.count as number || 0;
  }

  private generateSecureToken(): string {
    // Generate a secure random token with prefix
    const randomBytes = crypto.randomBytes(32).toString('hex');
    return `ifs_${randomBytes}`; // ifs = IAM File Server
  }

  private mapToken(token: any): ApiToken {
    return {
      id: token.id,
      name: token.name,
      token: token.token,
      description: token.description,
      created_by: token.created_by,
      is_active: Boolean(token.is_active),
      last_used_at: token.last_used_at ? new Date(token.last_used_at) : undefined,
      expires_at: token.expires_at ? new Date(token.expires_at) : undefined,
      created_at: new Date(token.created_at),
      updated_at: new Date(token.updated_at),
      creator: token.creator_name ? {
        id: token.created_by,
        name: token.creator_name,
        email: token.creator_email
      } : undefined
    };
  }
}
