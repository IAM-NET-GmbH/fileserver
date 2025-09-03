import { UserRepository, User, CreateUserData, UpdateUserData } from '../repositories/UserRepository';
import bcrypt from 'bcryptjs';

export class UserService {
  private userRepository: UserRepository;

  constructor() {
    this.userRepository = new UserRepository();
  }

  async getAllUsers(): Promise<User[]> {
    return await this.userRepository.findAll();
  }

  async getUserById(id: string): Promise<User | null> {
    return await this.userRepository.findById(id);
  }

  async getUserByEmail(email: string): Promise<User | null> {
    return await this.userRepository.findByEmail(email);
  }

  async createUser(userData: CreateUserData): Promise<User> {
    // Check if email already exists
    const existingUser = await this.userRepository.findByEmail(userData.email);
    if (existingUser) {
      throw new Error('Benutzer mit dieser E-Mail-Adresse existiert bereits');
    }

    return await this.userRepository.create(userData);
  }

  async updateUser(id: string, userData: UpdateUserData): Promise<User | null> {
    // Check if email already exists (if changing email)
    if (userData.email) {
      const existingUser = await this.userRepository.findByEmail(userData.email);
      if (existingUser && existingUser.id !== id) {
        throw new Error('Benutzer mit dieser E-Mail-Adresse existiert bereits');
      }
    }

    return await this.userRepository.update(id, userData);
  }

  async deleteUser(id: string, currentUserId: string): Promise<boolean> {
    // Prevent self-deletion
    if (id === currentUserId) {
      throw new Error('Sie können sich nicht selbst löschen');
    }

    // Check if this is the last admin
    const user = await this.userRepository.findById(id);
    if (user?.role === 'admin') {
      const adminCount = await this.userRepository.countAdmins();
      if (adminCount <= 1) {
        throw new Error('Der letzte Administrator kann nicht gelöscht werden');
      }
    }

    return await this.userRepository.delete(id);
  }

  async hasUsers(): Promise<boolean> {
    return await this.userRepository.hasUsers();
  }

  async authenticateUser(email: string, password: string): Promise<User | null> {
    return await this.userRepository.authenticateUser(email, password);
  }

  async createInitialAdmin(userData: Omit<CreateUserData, 'role'>): Promise<User> {
    // Ensure no users exist
    const hasExistingUsers = await this.userRepository.hasUsers();
    if (hasExistingUsers) {
      throw new Error('Initial Setup ist nicht möglich, da bereits Benutzer existieren');
    }

    return await this.userRepository.create({
      ...userData,
      role: 'admin'
    });
  }

  async changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void> {
    // First verify the current password
    const userWithPassword = await this.userRepository.knex('users')
      .select('password_hash')
      .where('id', userId)
      .first();

    if (!userWithPassword) {
      throw new Error('Benutzer nicht gefunden');
    }

    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, userWithPassword.password_hash);
    if (!isCurrentPasswordValid) {
      throw new Error('Aktuelles Passwort ist falsch');
    }

    // Hash new password and update
    const newPasswordHash = await bcrypt.hash(newPassword, 12);
    await this.userRepository.knex('users')
      .where('id', userId)
      .update({
        password_hash: newPasswordHash,
        updated_at: new Date()
      });
  }

}
