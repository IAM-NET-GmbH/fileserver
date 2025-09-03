import { ApiTokenRepository, ApiToken, CreateApiTokenData, UpdateApiTokenData } from '../repositories/ApiTokenRepository';

export class ApiTokenService {
  private apiTokenRepository: ApiTokenRepository;

  constructor() {
    this.apiTokenRepository = new ApiTokenRepository();
  }

  async getAllTokens(): Promise<ApiToken[]> {
    return await this.apiTokenRepository.findAll();
  }

  async getTokenById(id: string): Promise<ApiToken | null> {
    return await this.apiTokenRepository.findById(id);
  }

  async createToken(tokenData: CreateApiTokenData): Promise<ApiToken> {
    // Check if token name already exists
    const existingTokens = await this.apiTokenRepository.findAll();
    const nameExists = existingTokens.some(token => 
      token.name.toLowerCase() === tokenData.name.toLowerCase()
    );

    if (nameExists) {
      throw new Error('Ein Token mit diesem Namen existiert bereits');
    }

    return await this.apiTokenRepository.create(tokenData);
  }

  async updateToken(id: string, tokenData: UpdateApiTokenData): Promise<ApiToken | null> {
    // Check if new name already exists (if changing name)
    if (tokenData.name) {
      const existingTokens = await this.apiTokenRepository.findAll();
      const nameExists = existingTokens.some(token => 
        token.name.toLowerCase() === tokenData.name!.toLowerCase() && token.id !== id
      );

      if (nameExists) {
        throw new Error('Ein Token mit diesem Namen existiert bereits');
      }
    }

    return await this.apiTokenRepository.update(id, tokenData);
  }

  async deleteToken(id: string): Promise<boolean> {
    return await this.apiTokenRepository.delete(id);
  }

  async validateToken(tokenString: string): Promise<ApiToken | null> {
    const token = await this.apiTokenRepository.findByToken(tokenString);
    
    if (token) {
      // Update last used timestamp
      await this.apiTokenRepository.updateLastUsed(tokenString);
    }
    
    return token;
  }

  async getTokenStats(): Promise<{
    total: number;
    active: number;
    inactive: number;
  }> {
    const total = await this.apiTokenRepository.count();
    const active = await this.apiTokenRepository.countActive();
    
    return {
      total,
      active,
      inactive: total - active
    };
  }
}
