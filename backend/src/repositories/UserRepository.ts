import { Database } from '../database/database';
import { Knex } from 'knex';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export interface User {
  id: string;
  email: string;
  name: string;
  role: 'user' | 'admin';
  is_active: boolean;
  created_at: Date;
  updated_at: Date;
}

export interface CreateUserData {
  email: string;
  password: string;
  name: string;
  role: 'user' | 'admin';
}

export interface UpdateUserData {
  email?: string;
  name?: string;
  role?: 'user' | 'admin';
  is_active?: boolean;
  password?: string;
}

export class UserRepository {
  public knex: Knex;

  constructor() {
    this.knex = Database.getInstance().getKnex();
  }

  async findAll(): Promise<User[]> {
    const users = await this.knex('users')
      .select('id', 'email', 'name', 'role', 'is_active', 'created_at', 'updated_at')
      .orderBy('created_at', 'desc');
    
    return users.map(this.mapUser);
  }

  async findById(id: string): Promise<User | null> {
    const user = await this.knex('users')
      .select('id', 'email', 'name', 'role', 'is_active', 'created_at', 'updated_at')
      .where('id', id)
      .first();
    
    return user ? this.mapUser(user) : null;
  }

  async findByEmail(email: string): Promise<User | null> {
    const user = await this.knex('users')
      .select('id', 'email', 'name', 'role', 'is_active', 'created_at', 'updated_at')
      .where('email', email)
      .first();
    
    return user ? this.mapUser(user) : null;
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    const user = await this.knex('users')
      .select('id', 'email', 'name', 'role', 'is_active', 'password_hash', 'created_at', 'updated_at')
      .where('email', email)
      .where('is_active', true)
      .first();
    
    if (!user) {
      return null;
    }

    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    if (!isPasswordValid) {
      return null;
    }

    // Remove password_hash from the returned user object
    const { password_hash, ...userWithoutPassword } = user;
    return this.mapUser(userWithoutPassword);
  }

  async create(userData: CreateUserData): Promise<User> {
    const id = uuidv4();
    const password_hash = await bcrypt.hash(userData.password, 12);
    
    const userToInsert = {
      id,
      email: userData.email,
      password_hash,
      name: userData.name,
      role: userData.role,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date()
    };

    await this.knex('users').insert(userToInsert);
    
    const createdUser = await this.findById(id);
    if (!createdUser) {
      throw new Error('Failed to create user');
    }
    
    return createdUser;
  }

  async update(id: string, userData: UpdateUserData): Promise<User | null> {
    const updateData: any = {
      updated_at: new Date()
    };

    if (userData.email) updateData.email = userData.email;
    if (userData.name) updateData.name = userData.name;
    if (userData.role) updateData.role = userData.role;
    if (userData.is_active !== undefined) updateData.is_active = userData.is_active;
    
    if (userData.password) {
      updateData.password_hash = await bcrypt.hash(userData.password, 12);
    }

    const updatedCount = await this.knex('users')
      .where('id', id)
      .update(updateData);

    if (updatedCount === 0) {
      return null;
    }

    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const deletedCount = await this.knex('users')
      .where('id', id)
      .del();

    return deletedCount > 0;
  }

  async count(): Promise<number> {
    const result = await this.knex('users').count('id as count').first();
    return result?.count as number || 0;
  }

  async hasUsers(): Promise<boolean> {
    const count = await this.count();
    return count > 0;
  }

  async countAdmins(): Promise<number> {
    const result = await this.knex('users')
      .where('role', 'admin')
      .where('is_active', true)
      .count('id as count')
      .first();
    return result?.count as number || 0;
  }



  private mapUser(user: any): User {
    return {
      id: user.id,
      email: user.email,
      name: user.name,
      role: user.role,
      is_active: Boolean(user.is_active),
      created_at: new Date(user.created_at),
      updated_at: new Date(user.updated_at)
    };
  }
}
