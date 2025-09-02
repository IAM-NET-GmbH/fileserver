import { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  Download,
  Calendar,
  FileText,
  Trash2,
  ExternalLink,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';
import { useDownloads, useDeleteDownload } from '@/hooks/useApi';
import { DownloadFilter, SortOptions } from '@iam-fileserver/shared';
import { formatFileSize, formatDate, formatRelativeTime, cn } from '@/lib/utils';

export function Downloads() {
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [selectedProvider, setSelectedProvider] = useState('');
  const [sortField, setSortField] = useState<string>('downloadedAt');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [showFilters, setShowFilters] = useState(false);

  const filter: DownloadFilter = {
    ...(searchTerm && { search: searchTerm }),
    ...(selectedCategory && { category: selectedCategory }),
    ...(selectedProvider && { providerId: selectedProvider }),
  };

  const sort: SortOptions = {
    field: sortField,
    direction: sortDirection,
  };

  const { data: downloads, isLoading, error } = useDownloads(filter, sort, currentPage, 20);
  const deleteDownload = useDeleteDownload();

  const handleDelete = (id: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Download löschen möchten?')) {
      deleteDownload.mutate(id);
    }
  };

  const handleSort = (field: string) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const categories = Array.from(
    new Set(downloads?.items.map(d => d.category).filter(Boolean))
  ).sort();

  const providers = Array.from(
    new Set(downloads?.items.map(d => d.providerId).filter(Boolean))
  ).sort();

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <FileText className="w-12 h-12 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Fehler beim Laden der Downloads
        </h2>
        <p className="text-gray-600">{error.message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Downloads</h1>
          <p className="mt-1 text-gray-600">
            {downloads ? `${downloads.total} Downloads verfügbar` : 'Downloads werden geladen...'}
          </p>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="card p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
              <input
                type="text"
                placeholder="Downloads durchsuchen..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-10"
              />
            </div>
          </div>

          {/* Filter Toggle */}
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={cn(
              "btn-secondary flex items-center space-x-2",
              showFilters && "bg-primary-50 text-primary-700 border-primary-300"
            )}
          >
            <Filter className="w-4 h-4" />
            <span>Filter</span>
          </button>
        </div>

        {/* Filters */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Provider
                </label>
                <select
                  value={selectedProvider}
                  onChange={(e) => setSelectedProvider(e.target.value)}
                  className="input"
                >
                  <option value="">Alle Provider</option>
                  {providers.map(provider => (
                    <option key={provider} value={provider}>
                      {provider}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Kategorie
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="input"
                >
                  <option value="">Alle Kategorien</option>
                  {categories.map(category => (
                    <option key={category} value={category}>
                      {category}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Sortieren nach
                </label>
                <select
                  value={`${sortField}-${sortDirection}`}
                  onChange={(e) => {
                    const [field, direction] = e.target.value.split('-');
                    setSortField(field);
                    setSortDirection(direction as 'asc' | 'desc');
                  }}
                  className="input"
                >
                  <option value="downloadedAt-desc">Neueste zuerst</option>
                  <option value="downloadedAt-asc">Älteste zuerst</option>
                  <option value="fileName-asc">Name A-Z</option>
                  <option value="fileName-desc">Name Z-A</option>
                  <option value="fileSize-desc">Größe (groß zu klein)</option>
                  <option value="fileSize-asc">Größe (klein zu groß)</option>
                </select>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Downloads List */}
      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="card p-6 animate-pulse">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-gray-200 rounded-lg"></div>
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded w-3/4"></div>
                  <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : downloads && downloads.items.length > 0 ? (
        <div className="space-y-4">
          {downloads.items.map((download) => (
            <div key={download.id} className="card hover:shadow-medium transition-shadow">
              <div className="p-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4 flex-1 min-w-0">
                    {/* File Icon */}
                    <div className="flex-shrink-0">
                      <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                        <FileText className="w-6 h-6 text-primary-600" />
                      </div>
                    </div>

                    {/* File Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <Link
                          to={`/downloads/${download.id}`}
                          className="text-lg font-medium text-gray-900 hover:text-primary-600 truncate"
                        >
                          {download.title}
                        </Link>
                        {download.version !== 'unknown' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                            v{download.version}
                          </span>
                        )}
                      </div>
                      
                      <div className="mt-1 flex items-center space-x-4 text-sm text-gray-500">
                        <span>{formatFileSize(download.fileSize)}</span>
                        <span>•</span>
                        <span>{download.category}</span>
                        <span>•</span>
                        <span>{download.providerId}</span>
                        <span>•</span>
                        <span>{formatRelativeTime(download.downloadedAt)}</span>
                      </div>

                      {download.description && (
                        <p className="mt-2 text-sm text-gray-600 line-clamp-2">
                          {download.description}
                        </p>
                      )}

                      {/* Tags */}
                      {download.tags && download.tags.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-1">
                          {download.tags.slice(0, 3).map((tag, index) => (
                            <span
                              key={index}
                              className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-800"
                            >
                              {tag}
                            </span>
                          ))}
                          {download.tags.length > 3 && (
                            <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-gray-100 text-gray-800">
                              +{download.tags.length - 3} weitere
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center space-x-2">
                    <a
                      href={`/api/downloads/${download.id}/download`}
                      className="btn-primary btn-sm flex items-center space-x-1"
                      download
                    >
                      <Download className="w-4 h-4" />
                      <span>Download</span>
                    </a>
                    
                    <Link
                      to={`/downloads/${download.id}`}
                      className="btn-secondary btn-sm"
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Link>

                    <button
                      onClick={() => handleDelete(download.id)}
                      disabled={deleteDownload.isPending}
                      className="btn-ghost btn-sm text-red-600 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <FileText className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">
            Keine Downloads gefunden
          </h2>
          <p className="text-gray-600">
            {searchTerm || selectedCategory || selectedProvider
              ? 'Versuchen Sie andere Suchbegriffe oder Filter.'
              : 'Es sind noch keine Downloads verfügbar.'}
          </p>
        </div>
      )}

      {/* Pagination */}
      {downloads && downloads.pages > 1 && (
        <div className="flex items-center justify-between">
          <div className="text-sm text-gray-700">
            Zeige {((currentPage - 1) * 20) + 1} bis {Math.min(currentPage * 20, downloads.total)} von {downloads.total} Downloads
          </div>

          <div className="flex items-center space-x-2">
            <button
              onClick={() => setCurrentPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="btn-secondary btn-sm flex items-center space-x-1"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Zurück</span>
            </button>

            <div className="flex space-x-1">
              {Array.from({ length: Math.min(5, downloads.pages) }, (_, i) => {
                const page = i + 1;
                return (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={cn(
                      "px-3 py-2 text-sm font-medium rounded-lg",
                      page === currentPage
                        ? "bg-primary-600 text-white"
                        : "text-gray-700 hover:bg-gray-100"
                    )}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              onClick={() => setCurrentPage(currentPage + 1)}
              disabled={currentPage === downloads.pages}
              className="btn-secondary btn-sm flex items-center space-x-1"
            >
              <span>Weiter</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
