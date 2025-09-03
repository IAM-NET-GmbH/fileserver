import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Download,
  Calendar,
  HardDrive,
  Tag,
  Server,
  FileText,
  ExternalLink,
  Copy,
  Trash2,
  Terminal
} from 'lucide-react';
import { useDownload, useDeleteDownload } from '@/hooks/useApi';
import { formatFileSize, formatDate, copyToClipboard } from '@/lib/utils';
import toast from 'react-hot-toast';

export function DownloadDetail() {
  const { id } = useParams<{ id: string }>();
  const { data: download, isLoading, error } = useDownload(id!);
  const deleteDownload = useDeleteDownload();

  const handleCopyUrl = async () => {
    const url = `${window.location.origin}/api/downloads/${id}/download`;
    const success = await copyToClipboard(url);
    if (success) {
      toast.success('Download-URL in Zwischenablage kopiert');
    } else {
      toast.error('Fehler beim Kopieren der URL');
    }
  };

  const handleDirectLink = async () => {
    try {
      const response = await fetch(`/api/direct/${id}/token`);
      const data = await response.json();
      if (data.success) {
        const success = await copyToClipboard(data.data.directUrl);
        if (success) {
          toast.success('Direct-Link in Zwischenablage kopiert (24h gültig)');
        } else {
          toast.error('Fehler beim Kopieren des Links');
        }
      } else {
        toast.error('Fehler beim Erstellen des Direct-Links');
      }
    } catch (error) {
      toast.error('Fehler beim Erstellen des Direct-Links');
    }
  };

  const handleDelete = () => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Download löschen möchten?')) {
      deleteDownload.mutate(id!, {
        onSuccess: () => {
          // Navigate back to downloads list
          window.history.back();
        }
      });
    }
  };

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-6">
        <div className="flex items-center space-x-4">
          <div className="w-8 h-8 bg-gray-200 rounded"></div>
          <div className="h-8 bg-gray-200 rounded w-1/3"></div>
        </div>
        <div className="card p-6">
          <div className="space-y-4">
            <div className="h-6 bg-gray-200 rounded w-3/4"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !download) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-4">
          <FileText className="w-12 h-12 mx-auto" />
        </div>
        <h2 className="text-xl font-semibold text-gray-900 mb-2">
          Download nicht gefunden
        </h2>
        <p className="text-gray-600 mb-4">
          Der angeforderte Download konnte nicht gefunden werden.
        </p>
        <Link to="/downloads" className="btn-primary">
          Zurück zu Downloads
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center space-x-4">
        <Link
          to="/downloads"
          className="btn-ghost btn-sm flex items-center space-x-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Zurück</span>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Download Details</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Main Details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <div className="card">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-primary-100 rounded-lg flex items-center justify-center">
                      <FileText className="w-6 h-6 text-primary-600" />
                    </div>
                    <div>
                      <h2 className="text-xl font-semibold text-gray-900">
                        {download.title}
                      </h2>
                      <div className="flex items-center space-x-2 mt-1">
                        {download.version !== 'unknown' && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary-100 text-primary-800">
                            Version {download.version}
                          </span>
                        )}
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                          {download.category}
                        </span>
                      </div>
                    </div>
                  </div>

                  {download.description && (
                    <p className="mt-4 text-gray-600">
                      {download.description}
                    </p>
                  )}
                </div>

                {/* Action Buttons */}
                <div className="flex flex-col space-y-2">
                  <a
                    href={`/api/downloads/${download.id}/download`}
                    className="btn-primary flex items-center space-x-2"
                    download
                  >
                    <Download className="w-4 h-4" />
                    <span>Download</span>
                  </a>
                  <button
                    onClick={handleCopyUrl}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <Copy className="w-4 h-4" />
                    <span>URL kopieren</span>
                  </button>
                  <button
                    onClick={handleDirectLink}
                    className="btn-secondary flex items-center space-x-2"
                  >
                    <ExternalLink className="w-4 h-4" />
                    <span>Direct-Link</span>
                  </button>
                  <button
                    onClick={handleDelete}
                    disabled={deleteDownload.isPending}
                    className="btn-danger flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Löschen</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* File Information */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Datei-Informationen</h3>
            </div>
            <div className="p-6">
              <dl className="grid grid-cols-1 gap-x-4 gap-y-6 sm:grid-cols-2">
                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center space-x-2">
                    <FileText className="w-4 h-4" />
                    <span>Dateiname</span>
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900 font-mono">
                    {download.fileName}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center space-x-2">
                    <HardDrive className="w-4 h-4" />
                    <span>Dateigröße</span>
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatFileSize(download.fileSize)}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center space-x-2">
                    <Calendar className="w-4 h-4" />
                    <span>Heruntergeladen am</span>
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    {formatDate(download.downloadedAt)}
                  </dd>
                </div>

                <div>
                  <dt className="text-sm font-medium text-gray-500 flex items-center space-x-2">
                    <Server className="w-4 h-4" />
                    <span>Provider</span>
                  </dt>
                  <dd className="mt-1 text-sm text-gray-900">
                    <Link 
                      to={`/providers/${download.providerId}`}
                      className="text-primary-600 hover:text-primary-700 flex items-center space-x-1"
                    >
                      <span>{download.providerId}</span>
                      <ExternalLink className="w-3 h-3" />
                    </Link>
                  </dd>
                </div>

                {download.url && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Original URL</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                      {download.url}
                    </dd>
                  </div>
                )}

                {download.checksum && (
                  <div className="sm:col-span-2">
                    <dt className="text-sm font-medium text-gray-500">Prüfsumme (SHA-256)</dt>
                    <dd className="mt-1 text-sm text-gray-900 font-mono break-all">
                      {download.checksum}
                    </dd>
                  </div>
                )}
              </dl>
            </div>
          </div>

          {/* Metadata */}
          {download.metadata && Object.keys(download.metadata).length > 0 && (
            <div className="card">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Weitere Informationen</h3>
              </div>
              <div className="p-6">
                <dl className="space-y-4">
                  {Object.entries(download.metadata).map(([key, value]) => (
                    <div key={key}>
                      <dt className="text-sm font-medium text-gray-500 capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}
                      </dt>
                      <dd className="mt-1 text-sm text-gray-900">
                        {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                      </dd>
                    </div>
                  ))}
                </dl>
              </div>
            </div>
          )}
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Tags */}
          {download.tags && download.tags.length > 0 && (
            <div className="card">
              <div className="p-6 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                  <Tag className="w-4 h-4" />
                  <span>Tags</span>
                </h3>
              </div>
              <div className="p-6">
                <div className="flex flex-wrap gap-2">
                  {download.tags.map((tag, index) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Quick Actions */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Aktionen</h3>
            </div>
            <div className="p-6 space-y-3">
              <a
                href={`/api/downloads/${download.id}/download`}
                className="btn-primary w-full text-center flex items-center justify-center space-x-2"
                download
              >
                <Download className="w-4 h-4" />
                <span>Datei herunterladen</span>
              </a>
              
              <button
                onClick={handleCopyUrl}
                className="btn-secondary w-full flex items-center justify-center space-x-2"
              >
                <Copy className="w-4 h-4" />
                <span>Download-Link kopieren</span>
              </button>
              
              <Link
                to={`/providers/${download.providerId}`}
                className="btn-secondary w-full text-center flex items-center justify-center space-x-2"
              >
                <Server className="w-4 h-4" />
                <span>Provider anzeigen</span>
              </Link>
            </div>
          </div>

          {/* File Path Info */}
          {/* CLI Commands */}
          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900 flex items-center space-x-2">
                <Terminal className="w-5 h-5" />
                <span>CLI-Befehle</span>
              </h3>
              <p className="text-sm text-gray-600 mt-1">
                Direkte Download-Links für wget, curl und andere Tools
              </p>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">curl:</p>
                <div className="flex items-center space-x-2 bg-gray-100 p-3 rounded">
                  <code className="text-sm flex-1 text-gray-800 break-all">
                    curl -L -O "{window.location.origin}/api/direct/[TOKEN]"
                  </code>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/direct/${id}/token`);
                        const data = await response.json();
                        if (data.success) {
                          const curlCommand = `curl -L -O "${data.data.directUrl}"`;
                          await copyToClipboard(curlCommand);
                          toast.success('curl-Befehl kopiert!');
                        }
                      } catch (error) {
                        toast.error('Fehler beim Erstellen des Befehls');
                      }
                    }}
                    className="btn-ghost btn-sm flex items-center space-x-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span className="sr-only">Kopieren</span>
                  </button>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-700 mb-2">wget:</p>
                <div className="flex items-center space-x-2 bg-gray-100 p-3 rounded">
                  <code className="text-sm flex-1 text-gray-800 break-all">
                    wget "{window.location.origin}/api/direct/[TOKEN]"
                  </code>
                  <button
                    onClick={async () => {
                      try {
                        const response = await fetch(`/api/direct/${id}/token`);
                        const data = await response.json();
                        if (data.success) {
                          const wgetCommand = `wget "${data.data.directUrl}"`;
                          await copyToClipboard(wgetCommand);
                          toast.success('wget-Befehl kopiert!');
                        }
                      } catch (error) {
                        toast.error('Fehler beim Erstellen des Befehls');
                      }
                    }}
                    className="btn-ghost btn-sm flex items-center space-x-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span className="sr-only">Kopieren</span>
                  </button>
                </div>
              </div>
              
              <div className="text-sm text-amber-600 bg-amber-50 border border-amber-200 rounded p-3">
                <strong>Hinweis:</strong> Direct-Links sind 24 Stunden gültig. Neue Links können jederzeit über die "Direct-Link" Schaltfläche generiert werden.
              </div>
            </div>
          </div>

          <div className="card">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Speicherort</h3>
            </div>
            <div className="p-6">
              <p className="text-sm text-gray-600 mb-2">Server-Pfad:</p>
              <code className="text-xs bg-gray-100 p-2 rounded block break-all">
                {download.filePath}
              </code>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
