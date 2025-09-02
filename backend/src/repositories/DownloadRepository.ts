import { Knex } from 'knex';
import { DownloadItem, DownloadFilter, SortOptions, PaginatedResponse } from '@iam-fileserver/shared';
import { Database } from '../database/database';

export class DownloadRepository {
  private db: Knex;

  constructor() {
    this.db = Database.getInstance().getKnex();
  }

  async create(download: Omit<DownloadItem, 'createdAt'>): Promise<DownloadItem> {
    const downloadData = {
      id: download.id,
      provider_id: download.providerId,
      category: download.category,
      title: download.title,
      description: download.description,
      version: download.version,
      file_name: download.fileName,
      file_path: download.filePath,
      file_size: download.fileSize,
      downloaded_at: download.downloadedAt,
      url: download.url,
      checksum: download.checksum,
      tags: JSON.stringify(download.tags),
      metadata: JSON.stringify(download.metadata)
    };

    await this.db('downloads').insert(downloadData);
    const created = await this.findById(download.id);
    if (!created) {
      throw new Error(`Failed to create download with id: ${download.id}`);
    }
    return created;
  }

  async findById(id: string): Promise<DownloadItem | null> {
    const row = await this.db('downloads').where({ id }).first();
    if (!row) return null;
    return this.mapRowToDownloadItem(row);
  }

  async findAll(
    filter: DownloadFilter = {},
    sort: SortOptions = { field: 'downloaded_at', direction: 'desc' },
    page: number = 1,
    limit: number = 20
  ): Promise<PaginatedResponse<DownloadItem>> {
    let query = this.db('downloads');

    // Apply filters
    if (filter.providerId) {
      query = query.where('provider_id', filter.providerId);
    }
    
    if (filter.category) {
      query = query.where('category', filter.category);
    }

    if (filter.search) {
      query = query.where(function() {
        this.where('title', 'like', `%${filter.search}%`)
            .orWhere('description', 'like', `%${filter.search}%`)
            .orWhere('file_name', 'like', `%${filter.search}%`);
      });
    }

    if (filter.dateFrom) {
      query = query.where('downloaded_at', '>=', filter.dateFrom);
    }

    if (filter.dateTo) {
      query = query.where('downloaded_at', '<=', filter.dateTo);
    }

    if (filter.tags && filter.tags.length > 0) {
      query = query.whereRaw(
        'json_extract(tags, "$") LIKE ?',
        [`%${filter.tags.join('%')}%`]
      );
    }

    // Get total count
    const totalResult = await query.clone().count('* as count').first();
    const total = totalResult?.count as number || 0;

    // Apply sorting
    const sortField = this.mapSortField(sort.field);
    query = query.orderBy(sortField, sort.direction);

    // Apply pagination
    const offset = (page - 1) * limit;
    const rows = await query.offset(offset).limit(limit);

    const items = rows.map(row => this.mapRowToDownloadItem(row));
    
    return {
      items,
      total,
      page,
      limit,
      pages: Math.ceil(total / limit)
    };
  }

  async findByProvider(providerId: string): Promise<DownloadItem[]> {
    const rows = await this.db('downloads')
      .where('provider_id', providerId)
      .orderBy('downloaded_at', 'desc');

    return rows.map(row => this.mapRowToDownloadItem(row));
  }

  async findByCategory(category: string): Promise<DownloadItem[]> {
    const rows = await this.db('downloads')
      .where('category', category)
      .orderBy('downloaded_at', 'desc');

    return rows.map(row => this.mapRowToDownloadItem(row));
  }

  async update(id: string, updates: Partial<DownloadItem>): Promise<DownloadItem | null> {
    const updateData: any = {};
    
    if (updates.title) updateData.title = updates.title;
    if (updates.description) updateData.description = updates.description;
    if (updates.version) updateData.version = updates.version;
    if (updates.tags) updateData.tags = JSON.stringify(updates.tags);
    if (updates.metadata) updateData.metadata = JSON.stringify(updates.metadata);
    
    updateData.updated_at = new Date();

    await this.db('downloads').where({ id }).update(updateData);
    return this.findById(id);
  }

  async delete(id: string): Promise<boolean> {
    const deleted = await this.db('downloads').where({ id }).del();
    return deleted > 0;
  }

  async getStats(): Promise<{
    totalDownloads: number;
    totalSize: number;
    downloadsByProvider: Record<string, number>;
    downloadsByCategory: Record<string, number>;
  }> {
    const [totalResult, sizeResult, providerStats, categoryStats] = await Promise.all([
      this.db('downloads').count('* as count').first(),
      this.db('downloads').sum('file_size as total').first(),
      this.db('downloads')
        .select('provider_id')
        .count('* as count')
        .groupBy('provider_id'),
      this.db('downloads')
        .select('category')
        .count('* as count')
        .groupBy('category')
    ]);

    const downloadsByProvider: Record<string, number> = {};
    providerStats.forEach((stat: any) => {
      downloadsByProvider[stat.provider_id] = stat.count;
    });

    const downloadsByCategory: Record<string, number> = {};
    categoryStats.forEach((stat: any) => {
      downloadsByCategory[stat.category] = stat.count;
    });

    return {
      totalDownloads: totalResult?.count as number || 0,
      totalSize: sizeResult?.total as number || 0,
      downloadsByProvider,
      downloadsByCategory
    };
  }

  private mapRowToDownloadItem(row: any): DownloadItem {
    return {
      id: row.id,
      providerId: row.provider_id,
      category: row.category,
      title: row.title,
      description: row.description,
      version: row.version,
      fileName: row.file_name,
      filePath: row.file_path,
      fileSize: row.file_size,
      downloadedAt: new Date(row.downloaded_at),
      createdAt: new Date(row.created_at),
      url: row.url,
      checksum: row.checksum,
      tags: row.tags ? JSON.parse(row.tags) : [],
      metadata: row.metadata ? JSON.parse(row.metadata) : {}
    };
  }

  private mapSortField(field: string): string {
    const fieldMap: Record<string, string> = {
      'downloadedAt': 'downloaded_at',
      'createdAt': 'created_at',
      'fileName': 'file_name',
      'fileSize': 'file_size'
    };
    
    return fieldMap[field] || field;
  }
}
