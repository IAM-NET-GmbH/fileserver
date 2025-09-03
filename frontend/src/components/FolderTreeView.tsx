import React, { useState, useMemo } from 'react';
import {
  ChevronRight,
  ChevronDown,
  Folder,
  FolderOpen,
  FileText,
  Download,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { formatFileSize, formatRelativeTime, cn } from '@/lib/utils';
import { useDeleteDownload } from '@/hooks/useApi';

interface TreeNode {
  id: string;
  name: string;
  type: 'folder' | 'file';
  path: string;
  children: TreeNode[];
  download?: any; // DownloadItem
  level: number;
}

interface FolderTreeViewProps {
  downloads: any[];
  searchTerm?: string;
  selectedCategory?: string;
  selectedProvider?: string;
}

export function FolderTreeView({ downloads, searchTerm, selectedCategory, selectedProvider }: FolderTreeViewProps) {
  const [expandedPaths, setExpandedPaths] = useState<Set<string>>(new Set(['root']));
  const [selectedPath, setSelectedPath] = useState<string>('');
  const deleteDownload = useDeleteDownload();

  // Build tree structure from downloads
  const tree = useMemo(() => {
    const root: TreeNode = {
      id: 'root',
      name: 'Root',
      type: 'folder',
      path: '',
      children: [],
      level: 0
    };

    const pathMap = new Map<string, TreeNode>();
    pathMap.set('', root);

    downloads.forEach(download => {
      // Filter based on search and selections
      if (searchTerm && !download.title.toLowerCase().includes(searchTerm.toLowerCase())) return;
      if (selectedCategory && download.category !== selectedCategory) return;
      if (selectedProvider && download.providerId !== selectedProvider) return;

      // Create path: Provider -> Category -> File
      const pathParts = [download.providerId, download.category].filter(Boolean);
      let currentPath = '';
      let currentNode = root;

      // Create folder hierarchy
      pathParts.forEach((part, index) => {
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        
        if (!pathMap.has(currentPath)) {
          const folderNode: TreeNode = {
            id: currentPath,
            name: part,
            type: 'folder',
            path: currentPath,
            children: [],
            level: index + 1
          };
          pathMap.set(currentPath, folderNode);
          currentNode.children.push(folderNode);
        }
        currentNode = pathMap.get(currentPath)!;
      });

      // Add file to the current category folder
      const fileNode: TreeNode = {
        id: download.id,
        name: download.title,
        type: 'file',
        path: `${currentPath}/${download.title}`,
        children: [],
        download,
        level: pathParts.length + 1
      };
      currentNode.children.push(fileNode);
    });

    // Sort children: folders first, then files
    const sortNode = (node: TreeNode) => {
      node.children.sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'folder' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
      node.children.forEach(sortNode);
    };
    sortNode(root);

    return root;
  }, [downloads, searchTerm, selectedCategory, selectedProvider]);

  const toggleExpanded = (path: string) => {
    const newExpanded = new Set(expandedPaths);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedPaths(newExpanded);
  };

  const handleDelete = (id: string) => {
    if (window.confirm('Sind Sie sicher, dass Sie diesen Download löschen möchten?')) {
      deleteDownload.mutate(id);
    }
  };

  const renderNode = (node: TreeNode): React.ReactNode => {
    const isExpanded = expandedPaths.has(node.path);
    const hasChildren = node.children.length > 0;
    const isSelected = selectedPath === node.path;

    if (node.type === 'folder') {
      return (
        <div key={node.id} className={cn("select-none", node.level === 0 && "hidden")}>
          <div
            className={cn(
              "flex items-center py-2 px-3 hover:bg-gray-100 cursor-pointer rounded-lg",
              isSelected && "bg-blue-50 text-blue-700"
            )}
            style={{ paddingLeft: `${node.level * 16 + 12}px` }}
            onClick={() => {
              toggleExpanded(node.path);
              setSelectedPath(node.path);
            }}
          >
            <div className="flex items-center flex-1">
              {hasChildren && (
                <button className="mr-1 p-0.5 hover:bg-gray-200 rounded">
                  {isExpanded ? (
                    <ChevronDown className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
              )}
              {!hasChildren && <div className="w-5 mr-1" />}
              
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-600 mr-2" />
              ) : (
                <Folder className="w-4 h-4 text-blue-600 mr-2" />
              )}
              <span className="font-medium">{node.name}</span>
              <span className="ml-2 text-xs text-gray-500">({node.children.length})</span>
            </div>
          </div>

          {isExpanded && hasChildren && (
            <div>
              {node.children.map(child => renderNode(child))}
            </div>
          )}
        </div>
      );
    }

    // File node
    const download = node.download;
    return (
      <div
        key={node.id}
        className="ml-6 mb-2 p-4 bg-white border border-gray-200 rounded-lg hover:shadow-md transition-shadow"
        style={{ marginLeft: `${node.level * 16}px` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3 flex-1 min-w-0">
            <div className="flex-shrink-0">
              <div className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center">
                <FileText className="w-5 h-5 text-primary-600" />
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center space-x-2">
                <Link
                  to={`/downloads/${download.id}`}
                  className="font-medium text-gray-900 hover:text-primary-600 truncate"
                >
                  {download.title}
                </Link>
                {download.version !== 'unknown' && (
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    v{download.version}
                  </span>
                )}
              </div>
              
              <div className="mt-1 flex items-center space-x-3 text-xs text-gray-500">
                <span>{formatFileSize(download.fileSize)}</span>
                <span>{formatRelativeTime(download.downloadedAt)}</span>
              </div>

              {download.tags && download.tags.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {download.tags?.slice(0, 2).map((tag: string, index: number) => (
                    <span
                      key={index}
                      className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800"
                    >
                      {tag}
                    </span>
                  ))}
                  {download.tags.length > 2 && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                      +{download.tags.length - 2}
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
              title="Download"
            >
              <Download className="w-4 h-4" />
            </a>
            
            <Link
              to={`/downloads/${download.id}`}
              className="btn-secondary btn-sm"
              title="Details anzeigen"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>

            <button
              onClick={() => handleDelete(download.id)}
              disabled={deleteDownload.isPending}
              className="btn-ghost btn-sm text-red-600 hover:text-red-700 hover:bg-red-50"
              title="Löschen"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  if (tree.children.length === 0) {
    return (
      <div className="text-center py-12">
        <Folder className="w-12 h-12 text-gray-400 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-gray-900 mb-2">Keine Dateien gefunden</h3>
        <p className="text-gray-600">
          {searchTerm || selectedCategory || selectedProvider
            ? 'Versuchen Sie andere Suchbegriffe oder Filter.'
            : 'Es sind noch keine Downloads in der ausgewählten Struktur verfügbar.'}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {tree.children.map(node => renderNode(node))}
    </div>
  );
}
