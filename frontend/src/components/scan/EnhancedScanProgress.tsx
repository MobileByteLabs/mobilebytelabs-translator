import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  LinearProgress,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Chip,
  IconButton,
  Alert,
  CircularProgress,
} from '@mui/material';
import {
  CheckCircle,
  Error,
  PlayArrow,
  SkipNext,
  Folder,
  FolderOpen,
  Description,
  ExpandMore,
  ExpandLess,
  Code,
} from '@mui/icons-material';
import { AuthService } from '../../utils/auth';

interface FileTreeItem {
  name: string;
  path: string;
  type: 'file' | 'directory';
  status: 'pending' | 'scanning' | 'completed' | 'skipped' | 'error';
  children?: FileTreeItem[];
  isStringFile?: boolean;
  language?: string;
  stringCount?: number;
  error?: string;
}

interface ScanProgressUpdate {
  type: 'progress' | 'complete' | 'error';
  message: string;
  currentFile?: string;
  progress: {
    scannedItems: number;
    totalItems: number;
    percentage: number;
  };
  fileTree?: FileTreeItem[];
  scanResult?: any; // Keep as any since it can be partial or complete
}

interface EnhancedScanProgressProps {
  owner: string;
  repo: string;
  branch: string;
  onComplete: (scanResult: any) => void;
  onError: (error: string) => void;
  onProgress?: (update: ScanProgressUpdate) => void;
}

const EnhancedScanProgress: React.FC<EnhancedScanProgressProps> = ({
  owner,
  repo,
  branch,
  onComplete,
  onError,
  onProgress,
}) => {
  const [progress, setProgress] = useState<ScanProgressUpdate['progress']>({
    scannedItems: 0,
    totalItems: 0,
    percentage: 0,
  });
  const [currentMessage, setCurrentMessage] = useState('Initializing scan...');
  const [currentFile, setCurrentFile] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<FileTreeItem[]>([]);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [isScanning, setIsScanning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showOnlyStringFiles, setShowOnlyStringFiles] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);

  useEffect(() => {
    // Abort previous scan if it exists
    if (abortController) {
      abortController.abort();
    }

    // Reset state for new scan
    setProgress({ scannedItems: 0, totalItems: 0, percentage: 0 });
    setCurrentMessage('Initializing scan...');
    setCurrentFile(null);
    setFileTree([]);
    setExpandedFolders(new Set());
    setIsScanning(true);
    setError(null);

    const newAbortController = new AbortController();
    setAbortController(newAbortController);

    startEnhancedScan(newAbortController);

    // Cleanup function
    return () => {
      newAbortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [owner, repo, branch]);

  const startEnhancedScan = async (controller: AbortController) => {
    try {
      const authToken = AuthService.getToken();
      if (!authToken) {
        // eslint-disable-next-line no-throw-literal
        throw 'No authentication token found';
      }

      // Start the scan with POST request that returns SSE
      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/scan/repository/enhanced`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ owner, repo, branch }),
          signal: controller.signal,
        }
      );

      if (!response.ok) {
        // eslint-disable-next-line no-throw-literal
        throw 'Failed to start enhanced scan';
      }

      // Read the event stream
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let scanCompleted = false;
      let buffer = ''; // Buffer to accumulate incomplete JSON

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();

          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          buffer += chunk;

          // Process complete lines from buffer
          const lines = buffer.split('\n');

          // Keep the last line in buffer if it doesn't end with newline
          // (it might be incomplete)
          buffer = buffer.endsWith('\n') ? '' : lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const jsonStr = line.substring(6).trim();
                if (jsonStr) {
                  const data = JSON.parse(jsonStr);
                  handleProgressUpdate(data);

                  // Mark scan as completed if we receive complete or error event
                  if (data.type === 'complete' || data.type === 'error') {
                    scanCompleted = true;
                    break;
                  }
                }
              } catch (err: unknown) {
                const error = err as Error;
                console.warn('Failed to parse SSE data:', {
                  lineLength: line.length,
                  linePreview: line.substring(0, 200) + '...',
                  error: error instanceof Error ? error.message : String(error)
                });

                // For very large JSON, it might be split across chunks
                // Try to continue reading and accumulate in buffer
                if (error instanceof SyntaxError && error.message.includes('Unterminated')) {
                  console.log('JSON appears truncated, buffering for next chunk...');
                  buffer = line + '\n' + buffer; // Put the line back in buffer
                }
              }
            }
          }

          // Break outer loop if scan is completed
          if (scanCompleted) {
            break;
          }
        }

        // Process any remaining data in buffer
        if (buffer.trim() && buffer.startsWith('data: ')) {
          try {
            const jsonStr = buffer.substring(6).trim();
            if (jsonStr) {
              const data = JSON.parse(jsonStr);
              handleProgressUpdate(data);
            }
          } catch (err) {
            console.warn('Failed to parse final buffered data:', err);
          }
        }
      }

    } catch (error: any) {
      // Don't show errors for aborted requests
      if (error.name === 'AbortError' || controller.signal.aborted) {
        console.log('Scan was aborted');
        return;
      }

      console.error('Enhanced scan error:', error);
      const errorMessage = error?.message || error || 'Scan failed';
      setError(errorMessage);
      onError(errorMessage);
      setIsScanning(false);
    }
  };

  const fetchFullScanResult = async () => {
    try {
      setCurrentMessage('Fetching scan results...');

      const authToken = AuthService.getToken();
      if (!authToken) {
        // eslint-disable-next-line no-throw-literal
        throw 'No authentication token found';
      }

      const response = await fetch(
        `${process.env.REACT_APP_API_URL || 'http://localhost:3001'}/api/scan/repository`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${authToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ owner, repo, branch }),
        }
      );

      if (!response.ok) {
        // eslint-disable-next-line no-throw-literal
        throw 'Failed to fetch scan results';
      }

      const result = await response.json();
      console.log('✅ Full scan result fetched');
      onComplete(result.data.scan);

    } catch (err: unknown) {
      const error = err as Error;
      console.error('❌ Error fetching full scan result:', error);
      const errorMessage = error instanceof Error ? error.message : (typeof error === 'string' ? error : 'Failed to fetch scan results');
      setError(errorMessage);
      onError(errorMessage);
    }
  };

  const handleProgressUpdate = (update: ScanProgressUpdate) => {
    console.log('📊 Progress update:', {
      type: update.type,
      message: update.message,
      currentFile: update.currentFile,
      progress: update.progress,
      hasFileTree: !!update.fileTree,
      fileTreeSize: update.fileTree?.length || 0
    });

    setProgress(update.progress);
    setCurrentMessage(update.message);
    setCurrentFile(update.currentFile || null);

    if (update.fileTree) {
      setFileTree(update.fileTree);
      console.log('🌳 Updated file tree with', update.fileTree.length, 'root items');
    }

    // Call onProgress callback if provided
    if (onProgress) {
      onProgress(update);
    }

    if (update.type === 'complete') {
      setIsScanning(false);
      if (update.scanResult) {
        // Check if we have a complete scanResult or just summary data
        if (update.scanResult.defaultStrings) {
          console.log('✅ Scan completed with full result');
          onComplete(update.scanResult);
        } else {
          console.log('✅ Scan completed, fetching full result...');
          // For large results, fetch the complete data using the regular scan endpoint
          fetchFullScanResult();
        }
      }
    } else if (update.type === 'error') {
      setIsScanning(false);
      setError(update.message);
      onError(update.message);
    }
  };

  const toggleFolder = (path: string) => {
    const newExpanded = new Set(expandedFolders);
    if (newExpanded.has(path)) {
      newExpanded.delete(path);
    } else {
      newExpanded.add(path);
    }
    setExpandedFolders(newExpanded);
  };

  // Flatten tree for performance and filtering
  const flattenedTree = useMemo(() => {
    const items: (FileTreeItem & { level: number })[] = [];

    const flatten = (treeItems: FileTreeItem[], level: number = 0) => {
      for (const item of treeItems) {
        // Filter by string files if enabled
        if (showOnlyStringFiles && item.type === 'file' && !item.isStringFile) {
          continue;
        }

        items.push({ ...item, level });

        // Add children if expanded or if we're showing only string files
        if (item.children && (expandedFolders.has(item.path) || showOnlyStringFiles)) {
          flatten(item.children, level + 1);
        }
      }
    };

    flatten(fileTree);
    return items;
  }, [fileTree, expandedFolders, showOnlyStringFiles]);

  // Auto-expand directories that contain string files
  useEffect(() => {
    if (showOnlyStringFiles && fileTree.length > 0) {
      const newExpanded = new Set(expandedFolders);

      const findStringFiles = (items: FileTreeItem[], path: string[] = []) => {
        for (const item of items) {
          if (item.type === 'directory' && item.children) {
            const hasStringFile = item.children.some(child =>
              child.isStringFile || (child.children && child.children.some(grandchild => grandchild.isStringFile))
            );
            if (hasStringFile) {
              newExpanded.add(item.path);
            }
            findStringFiles(item.children, [...path, item.name]);
          }
        }
      };

      findStringFiles(fileTree);
      setExpandedFolders(newExpanded);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showOnlyStringFiles, fileTree]);

  // Performance optimization: only show first 1000 items
  const visibleItems = useMemo(() => {
    return flattenedTree.slice(0, 1000);
  }, [flattenedTree]);

  const getStatusIcon = (item: FileTreeItem) => {
    const isDirectory = item.type === 'directory';

    // For directories, show folder icon with status overlay
    if (isDirectory) {
      const FolderIcon = expandedFolders.has(item.path) ? FolderOpen : Folder;
      const baseIcon = <FolderIcon sx={{ color: 'rgba(255,255,255,0.7)', fontSize: 16 }} />;

      // Add status indicator for directories
      switch (item.status) {
        case 'scanning':
          return (
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              {baseIcon}
              <CircularProgress
                size={8}
                sx={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  color: '#6366f1'
                }}
              />
            </Box>
          );
        case 'completed':
          return (
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              {baseIcon}
              <CheckCircle
                sx={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  color: '#22c55e',
                  fontSize: 8,
                  backgroundColor: 'rgba(26, 26, 46, 1)',
                  borderRadius: '50%'
                }}
              />
            </Box>
          );
        case 'error':
          return (
            <Box sx={{ position: 'relative', display: 'inline-flex' }}>
              {baseIcon}
              <Error
                sx={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  color: '#ef4444',
                  fontSize: 8,
                  backgroundColor: 'rgba(26, 26, 46, 1)',
                  borderRadius: '50%'
                }}
              />
            </Box>
          );
        default:
          return baseIcon;
      }
    }

    // For files, show status-based icons
    switch (item.status) {
      case 'scanning':
        return <CircularProgress size={16} sx={{ color: '#6366f1' }} />;
      case 'completed':
        return <CheckCircle sx={{ color: '#22c55e', fontSize: 16 }} />;
      case 'error':
        return <Error sx={{ color: '#ef4444', fontSize: 16 }} />;
      case 'skipped':
        return <SkipNext sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }} />;
      default:
        return <Description sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 16 }} />;
    }
  };

  const getStatusColor = (status: FileTreeItem['status']) => {
    switch (status) {
      case 'scanning':
        return '#6366f1';
      case 'completed':
        return '#22c55e';
      case 'error':
        return '#ef4444';
      case 'skipped':
        return 'rgba(255,255,255,0.5)';
      default:
        return 'rgba(255,255,255,0.7)';
    }
  };

  const renderFileTreeItem = (item: FileTreeItem & { level: number }) => {
    const isExpanded = expandedFolders.has(item.path);
    const hasChildren = item.children && item.children.length > 0;

    return (
      <ListItem
        key={item.path}
        sx={{
          pl: item.level * 2 + 1,
          py: 0.5,
          borderRadius: 1,
          backgroundColor: currentFile === item.path ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
          border: currentFile === item.path ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid transparent',
          mb: 0.5,
        }}
      >
        <ListItemIcon sx={{ minWidth: 32 }}>
          {getStatusIcon(item)}
        </ListItemIcon>

        <ListItemText
          primary={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography
                variant="body2"
                sx={{
                  color: getStatusColor(item.status),
                  fontWeight: currentFile === item.path ? 600 : 400,
                }}
              >
                {item.name}
              </Typography>

              {item.isStringFile && (
                <Chip
                  label={item.language || 'default'}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.6rem',
                    backgroundColor: 'rgba(99, 102, 241, 0.1)',
                    color: '#6366f1',
                    border: '1px solid rgba(99, 102, 241, 0.3)',
                  }}
                />
              )}

              {item.stringCount !== undefined && (
                <Chip
                  label={`${item.stringCount} strings`}
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.6rem',
                    backgroundColor: 'rgba(34, 197, 94, 0.1)',
                    color: '#22c55e',
                    border: '1px solid rgba(34, 197, 94, 0.3)',
                  }}
                />
              )}

              {item.error && (
                <Chip
                  label="Error"
                  size="small"
                  sx={{
                    height: 16,
                    fontSize: '0.6rem',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    color: '#ef4444',
                    border: '1px solid rgba(239, 68, 68, 0.3)',
                  }}
                />
              )}
            </Box>
          }
          secondary={item.error ? (
            <Typography variant="caption" sx={{ color: '#ef4444' }}>
              {item.error}
            </Typography>
          ) : null}
        />

        {hasChildren && (
          <IconButton
            size="small"
            onClick={() => toggleFolder(item.path)}
            sx={{ color: 'rgba(255,255,255,0.7)' }}
          >
            {isExpanded ? <ExpandLess /> : <ExpandMore />}
          </IconButton>
        )}
      </ListItem>
    );
  };

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 3 }}>
        <Typography variant="body2">{error}</Typography>
      </Alert>
    );
  }

  return (
    <Box>
      {/* Progress Header */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography
            variant="h6"
            sx={{
              color: 'white',
              mb: 2,
              display: 'flex',
              alignItems: 'center',
              gap: 1,
            }}
          >
            <PlayArrow sx={{ fontSize: 20 }} />
            Scanning Repository: {owner}/{repo} ({branch})
          </Typography>

          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)', mb: 2 }}>
            {currentMessage}
          </Typography>

          {currentFile && (
            <Typography variant="caption" sx={{ color: '#6366f1', mb: 2, display: 'block' }}>
              Currently scanning: {currentFile}
            </Typography>
          )}

          <LinearProgress
            variant="determinate"
            value={progress.percentage}
            sx={{
              height: 8,
              borderRadius: 4,
              backgroundColor: 'rgba(255,255,255,0.1)',
              mb: 2,
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#6366f1',
                borderRadius: 4,
              },
            }}
          />

          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.7)' }}>
            Progress: {progress.scannedItems} / {progress.totalItems} items ({progress.percentage}%)
          </Typography>
        </CardContent>
      </Card>

      {/* File Tree */}
      {fileTree.length > 0 && (
        <Card>
          <CardContent>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
              <Typography
                variant="h6"
                sx={{
                  color: 'white',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                }}
              >
                <Code sx={{ fontSize: 20 }} />
                Repository Structure
              </Typography>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={showOnlyStringFiles ? 'String Files Only' : 'All Files'}
                  onClick={() => setShowOnlyStringFiles(!showOnlyStringFiles)}
                  size="small"
                  sx={{
                    backgroundColor: showOnlyStringFiles ? 'rgba(99, 102, 241, 0.2)' : 'rgba(255, 255, 255, 0.1)',
                    color: showOnlyStringFiles ? '#6366f1' : 'rgba(255, 255, 255, 0.7)',
                    border: showOnlyStringFiles ? '1px solid rgba(99, 102, 241, 0.3)' : '1px solid rgba(255, 255, 255, 0.2)',
                    cursor: 'pointer',
                    '&:hover': {
                      backgroundColor: showOnlyStringFiles ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255, 255, 255, 0.2)',
                    }
                  }}
                />
                <Chip
                  label={`${visibleItems.length}/${flattenedTree.length} items`}
                  size="small"
                  sx={{
                    backgroundColor: 'rgba(255, 255, 255, 0.1)',
                    color: 'rgba(255, 255, 255, 0.7)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                  }}
                />
              </Box>
            </Box>

            <Box
              sx={{
                maxHeight: 400,
                overflowY: 'auto',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 1,
                backgroundColor: 'rgba(0, 0, 0, 0.2)',
              }}
            >
              <List dense sx={{ py: 1 }}>
                {visibleItems.map(item => renderFileTreeItem(item))}
                {flattenedTree.length > 1000 && (
                  <ListItem>
                    <ListItemText
                      primary={
                        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.6)', fontStyle: 'italic' }}>
                          ... and {flattenedTree.length - 1000} more items (use filters to see more)
                        </Typography>
                      }
                    />
                  </ListItem>
                )}
              </List>
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
};

export default EnhancedScanProgress;