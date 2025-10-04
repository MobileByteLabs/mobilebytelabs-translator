// backend/src/services/scannerService.ts
import { GitHubService } from './githubService';
import * as xml2js from 'xml2js';

interface StringResource {
  key: string;
  value: string;
  translatable?: boolean;
}

interface StringFile {
  path: string;
  language?: string;
  strings: StringResource[];
}

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
  scanResult?: Partial<ScanResult>;
}

interface ScanResult {
  defaultStrings: StringResource[];
  existingTranslations: { [language: string]: StringResource[] };
  missingTranslations: { [language: string]: string[] };
  availableLanguages: string[];
  totalStrings: number;
  branches: string[];
  fileTree: FileTreeItem[];
}

export class ScannerService {
  private githubService: GitHubService;

  constructor(githubToken: string) {
    this.githubService = new GitHubService(githubToken);
  }

  // Common patterns for finding string resources
  private readonly STRING_PATTERNS = [
    // KMP specific patterns - prioritize these
    "feature/*/src/commonMain/composeResources/values/strings.xml",
    "feature/*/src/*/composeResources/values/strings.xml",
    "feature/*/src/*/resources/values/strings.xml",

    // KMM/Compose Multiplatform patterns
    "*/src/commonMain/composeResources/values/strings.xml",
    "*/*/src/commonMain/composeResources/values/strings.xml",
    "*/src/commonMain/resources/MR/base/strings.xml",
    "*/*/src/commonMain/resources/MR/base/strings.xml",

    // Android module patterns
    "*/src/main/res/values/strings.xml",
    "*/*/src/main/res/values/strings.xml",
    "feature/*/src/main/res/values/strings.xml",

    // General fallbacks
    "**/values/strings.xml",
    "**/values-*/strings.xml"
  ];

  // Get repository branches
  async getRepositoryBranches(owner: string, repo: string): Promise<string[]> {
    try {
      console.log(`<3 Fetching branches for ${owner}/${repo}...`);

      // Use Octokit directly to get branches
      const octokit = (this.githubService as any).octokit;
      const response = await octokit.rest.repos.listBranches({
        owner,
        repo,
        per_page: 50
      });

      const branches = response.data.map((branch: any) => branch.name);
      console.log(` Found ${branches.length} branches:`, branches);

      return branches;
    } catch (error) {
      console.error(`L Error fetching branches:`, error);
      throw new Error('Failed to fetch repository branches');
    }
  }

  // Scan repository for translatable strings
  async scanRepository(owner: string, repo: string, branch: string = 'main'): Promise<ScanResult> {
    try {
      console.log(`= Scanning repository ${owner}/${repo} on branch ${branch}...`);

      // Get repository tree
      const tree = await this.githubService.getRepositoryTree(owner, repo, branch);

      // Find string files using patterns
      const stringFiles = await this.findStringFiles(owner, repo, branch, tree);

      if (stringFiles.length === 0) {
        throw new Error('No translatable string files found in repository');
      }

      // Process string files
      const defaultStrings = this.getDefaultStrings(stringFiles);
      const existingTranslations = this.getExistingTranslations(stringFiles);
      const missingTranslations = this.calculateMissingTranslations(defaultStrings, existingTranslations);
      const availableLanguages = Object.keys(existingTranslations);
      const branches = await this.getRepositoryBranches(owner, repo);

      console.log(` Scan complete. Found ${defaultStrings.length} default strings, ${availableLanguages.length} language(s)`);

      // Build file tree for visualization
      const fileTree = this.buildFileTree(tree, stringFiles);

      return {
        defaultStrings,
        existingTranslations,
        missingTranslations,
        availableLanguages,
        totalStrings: defaultStrings.length,
        branches,
        fileTree
      };

    } catch (error) {
      console.error(`L Error scanning repository:`, error);
      throw error;
    }
  }

  // Find string files in repository
  private async findStringFiles(owner: string, repo: string, branch: string, tree: any[]): Promise<StringFile[]> {
    const stringFiles: StringFile[] = [];

    // Look for string files using patterns
    for (const item of tree) {
      if (item.type === 'blob' && this.isStringFile(item.path)) {
        try {
          const content = await this.githubService.getFileContent(owner, repo, item.path, branch);
          const language = this.extractLanguageFromPath(item.path);
          const strings = await this.parseStringFile(content, item.path);

          stringFiles.push({
            path: item.path,
            language,
            strings
          });

          console.log(`=� Found string file: ${item.path} (${language || 'default'}) with ${strings.length} strings`);
        } catch (error) {
          console.warn(`� Could not parse string file ${item.path}:`, error);
        }
      }
    }

    return stringFiles;
  }

  // Check if file matches string patterns
  private isStringFile(path: string): boolean {
    // Direct pattern matching
    if (path.includes('/values/strings.xml') || path.includes('/values-') && path.includes('/strings.xml')) {
      return true;
    }

    // Check against patterns
    return this.STRING_PATTERNS.some(pattern => {
      const regex = new RegExp(pattern.replace(/\*/g, '[^/]*').replace(/\*\*/g, '.*'));
      return regex.test(path);
    });
  }

  // Extract language code from file path
  private extractLanguageFromPath(path: string): string | undefined {
    // Standard Android pattern: values-xx/strings.xml or values-xx-rYY/strings.xml
    const androidMatch = path.match(/\/values-([a-z]{2}(?:-r[A-Z]{2})?)\//);
    if (androidMatch) {
      return androidMatch[1];
    }

    // Compose Multiplatform pattern: values-xx/strings.xml
    const composeMatch = path.match(/\/values-([a-z]{2})\//);
    if (composeMatch) {
      return composeMatch[1];
    }

    // Default values folder (English)
    if (path.includes('/values/strings.xml')) {
      return undefined; // Default language
    }

    return undefined;
  }

  // Parse XML string file
  private async parseStringFile(content: string, filePath: string): Promise<StringResource[]> {
    try {
      const parser = new xml2js.Parser({ explicitArray: false });
      const result = await parser.parseStringPromise(content);

      if (!result.resources || !result.resources.string) {
        return [];
      }

      const strings = Array.isArray(result.resources.string)
        ? result.resources.string
        : [result.resources.string];

      return strings.map((item: any) => {
        if (typeof item === 'object') {
          const key = item.$ && item.$.name ? String(item.$.name) : '';
          let value = '';

          if (item._) {
            value = String(item._);
          } else if (typeof item === 'string') {
            value = item;
          } else if (item.$ && typeof item !== 'object') {
            value = String(item);
          } else {
            // Fallback: try to extract text content, avoiding $ objects
            value = String(item).replace(/\[object Object\]/g, '');
          }

          const translatable = item.$ && item.$.translatable ? item.$.translatable !== 'false' : true;

          return { key, value, translatable };
        } else {
          return {
            key: '',
            value: String(item),
            translatable: true
          };
        }
      }).filter((s: StringResource) => s.key && s.value && typeof s.value === 'string');

    } catch (error) {
      console.error(`L Error parsing XML file ${filePath}:`, error);

      // Fallback: try to extract strings using regex
      return this.parseStringFileRegex(content);
    }
  }

  // Fallback regex-based string parsing
  private parseStringFileRegex(content: string): StringResource[] {
    const strings: StringResource[] = [];
    const stringRegex = /<string\s+name="([^"]+)"[^>]*>([^<]+)<\/string>/g;

    let match;
    while ((match = stringRegex.exec(content)) !== null) {
      strings.push({
        key: match[1],
        value: match[2],
        translatable: true
      });
    }

    return strings;
  }

  // Get default (English) strings
  private getDefaultStrings(stringFiles: StringFile[]): StringResource[] {
    const defaultFile = stringFiles.find(f => !f.language);
    return defaultFile ? defaultFile.strings : [];
  }

  // Get existing translations
  private getExistingTranslations(stringFiles: StringFile[]): { [language: string]: StringResource[] } {
    const translations: { [language: string]: StringResource[] } = {};

    stringFiles.forEach(file => {
      if (file.language) {
        translations[file.language] = file.strings;
      } else {
        // Default strings (English) - combine all default files
        if (!translations['en']) {
          translations['en'] = [];
        }
        translations['en'].push(...file.strings);
      }
    });

    return translations;
  }

  // Calculate missing translations
  private calculateMissingTranslations(
    defaultStrings: StringResource[],
    existingTranslations: { [language: string]: StringResource[] }
  ): { [language: string]: string[] } {
    const missing: { [language: string]: string[] } = {};

    const defaultKeys = new Set(defaultStrings.map(s => s.key));

    Object.keys(existingTranslations).forEach(language => {
      const existingKeys = new Set(existingTranslations[language].map(s => s.key));
      missing[language] = Array.from(defaultKeys).filter(key => !existingKeys.has(key));
    });

    return missing;
  }

  // Generate translation file content
  generateTranslationFile(strings: StringResource[]): string {
    const xmlHeader = '<?xml version="1.0" encoding="utf-8"?>\n';
    const xmlContent = strings.map(s =>
      `    <string name="${s.key}">${this.escapeXml(s.value)}</string>`
    ).join('\n');

    return `${xmlHeader}<resources>\n${xmlContent}\n</resources>\n`;
  }

  // Escape XML special characters
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Get path for new translation file
  getTranslationFilePath(basePath: string, language: string): string {
    // Replace values/ with values-{language}/
    if (basePath.includes('/values/strings.xml')) {
      return basePath.replace('/values/strings.xml', `/values-${language}/strings.xml`);
    }

    // For other patterns, try to infer the correct path
    const pathParts = basePath.split('/');
    const valuesIndex = pathParts.findIndex(part => part.startsWith('values'));

    if (valuesIndex !== -1) {
      pathParts[valuesIndex] = `values-${language}`;
      return pathParts.join('/');
    }

    // Fallback: append language to directory
    const dir = basePath.substring(0, basePath.lastIndexOf('/'));
    return `${dir}/values-${language}/strings.xml`;
  }

  // Scan repository with progress updates
  async scanRepositoryWithProgress(
    owner: string,
    repo: string,
    branch: string = 'main',
    progressCallback?: (update: ScanProgressUpdate) => void
  ): Promise<ScanResult> {
    try {
      console.log(`🔍 Starting enhanced scan for ${owner}/${repo} on branch ${branch}...`);

      const sendProgress = (update: ScanProgressUpdate) => {
        if (progressCallback) {
          progressCallback(update);
        }
      };

      // Step 1: Get repository tree
      sendProgress({
        type: 'progress',
        message: 'Fetching repository structure...',
        progress: { scannedItems: 0, totalItems: 0, percentage: 0 }
      });

      const tree = await this.githubService.getRepositoryTree(owner, repo, branch);

      // Check repository size and warn if too large
      if (tree.length > 50000) {
        throw new Error(`Repository is too large (${tree.length} files). Please use a smaller repository or contact support for assistance.`);
      } else if (tree.length > 20000) {
        sendProgress({
          type: 'progress',
          message: `Very large repository detected (${tree.length} items). This may take several minutes and use significant memory...`,
          progress: { scannedItems: 0, totalItems: tree.length, percentage: 0 }
        });
      } else if (tree.length > 10000) {
        sendProgress({
          type: 'progress',
          message: `Large repository detected (${tree.length} items). This may take some time...`,
          progress: { scannedItems: 0, totalItems: tree.length, percentage: 0 }
        });
      }

      // Build initial file tree structure (but don't send it for very large repos)
      const isLargeRepo = tree.length > 5000;
      const isMassiveRepo = tree.length > 15000;
      const fileTree = isLargeRepo ? [] : this.buildFileTree(tree, []);
      const totalItems = tree.length; // Use actual file count instead of tree count
      let scannedItems = 0;

      sendProgress({
        type: 'progress',
        message: `Found ${totalItems} items in repository${isLargeRepo ? ' - using optimized scanning for large repository' : ''}`,
        progress: { scannedItems: 0, totalItems, percentage: 0 },
        fileTree: isLargeRepo ? [] : fileTree
      });

      // Step 2: Process string files with progress updates
      const stringFiles: StringFile[] = [];
      const processedPaths = new Set<string>();

      for (const item of tree) {
        if (item.type === 'blob' && this.isStringFile(item.path)) {
          try {
            // Update file status (only for small repos with file tree)
            if (!isLargeRepo) {
              this.updateFileTreeStatus(fileTree, item.path, 'scanning');
              this.updateDirectoryStatus(fileTree, item.path, 'scanning');
            }

            sendProgress({
              type: 'progress',
              message: `Scanning ${item.path}...`,
              currentFile: item.path,
              progress: { scannedItems, totalItems, percentage: Math.round((scannedItems / totalItems) * 100) },
              fileTree: isLargeRepo ? [] : fileTree
            });

            // Remove delay for large repos to speed up processing
            if (!isLargeRepo) {
              await new Promise(resolve => setTimeout(resolve, 50));
            } else if (isMassiveRepo) {
              // For massive repos, add tiny delay to prevent overwhelming the system
              await new Promise(resolve => setTimeout(resolve, 1));
            }

            const content = await this.githubService.getFileContent(owner, repo, item.path, branch);
            const language = this.extractLanguageFromPath(item.path);
            const strings = await this.parseStringFile(content, item.path);

            stringFiles.push({
              path: item.path,
              language,
              strings
            });

            // Update file status (only for small repos with file tree)
            if (!isLargeRepo) {
              this.updateFileTreeStatus(fileTree, item.path, 'completed', strings.length);
              this.updateDirectoryStatus(fileTree, item.path, 'completed');
            }
            processedPaths.add(item.path);

            scannedItems++;
            console.log(`✅ Processed string file: ${item.path} (${language || 'default'}) with ${strings.length} strings`);

          } catch (error) {
            console.warn(`⚠️ Could not parse string file ${item.path}:`, error);
            if (!isLargeRepo) {
              this.updateFileTreeStatus(fileTree, item.path, 'error', 0, error instanceof Error ? error.message : 'Parse error');
              this.updateDirectoryStatus(fileTree, item.path, 'error');
            }
            scannedItems++;
          }
        } else {
          // Mark non-string files as skipped (only for small repos)
          if (item.type === 'blob' && !isLargeRepo) {
            this.updateFileTreeStatus(fileTree, item.path, 'skipped');
          }
          scannedItems++;
        }

        // Send periodic progress updates (less frequent for large repos)
        const updateFrequency = isMassiveRepo ? 500 : isLargeRepo ? 200 : 50;
        if (scannedItems % updateFrequency === 0 || scannedItems === totalItems) {
          const progressMessage = isMassiveRepo
            ? `Processing large repository: ${scannedItems}/${totalItems} items...`
            : `Processed ${scannedItems}/${totalItems} items...`;

          sendProgress({
            type: 'progress',
            message: progressMessage,
            progress: { scannedItems, totalItems, percentage: Math.round((scannedItems / totalItems) * 100) },
            fileTree: isLargeRepo ? [] : fileTree
          });
        }
      }

      // Mark all remaining directories as completed
      this.markAllDirectoriesCompleted(fileTree);

      if (stringFiles.length === 0) {
        throw new Error('No translatable string files found in repository');
      }

      // Step 3: Process results
      sendProgress({
        type: 'progress',
        message: isMassiveRepo ? 'Finalizing scan results for large repository...' : 'Processing scan results...',
        progress: { scannedItems: totalItems, totalItems, percentage: 100 },
        fileTree: fileTree
      });

      // For massive repos, add a small delay to ensure UI updates properly
      if (isMassiveRepo) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      const defaultStrings = this.getDefaultStrings(stringFiles);
      const existingTranslations = this.getExistingTranslations(stringFiles);
      const missingTranslations = this.calculateMissingTranslations(defaultStrings, existingTranslations);
      const availableLanguages = Object.keys(existingTranslations);
      const branches = await this.getRepositoryBranches(owner, repo);

      const scanResult: ScanResult = {
        defaultStrings,
        existingTranslations,
        missingTranslations,
        availableLanguages,
        totalStrings: defaultStrings.length,
        branches,
        fileTree
      };

      // Send completion update with minimal data to avoid JSON truncation
      // For large datasets, we'll let the frontend retrieve the full result separately
      const shouldSendFullResult = defaultStrings.length < 100 && totalItems < 1000;

      sendProgress({
        type: 'complete',
        message: `Scan complete! Found ${defaultStrings.length} default strings in ${stringFiles.length} files`,
        progress: { scannedItems: totalItems, totalItems, percentage: 100 },
        scanResult: shouldSendFullResult ? {
          totalStrings: defaultStrings.length,
          availableLanguages: availableLanguages,
          defaultStrings: defaultStrings,
          existingTranslations: existingTranslations,
          missingTranslations: missingTranslations,
          branches: branches,
          fileTree: isLargeRepo ? [] : fileTree
        } : {
          // For large results, send only summary data
          totalStrings: defaultStrings.length,
          availableLanguages: availableLanguages,
          branches: branches,
          fileTree: []
        }
      });

      console.log(`✅ Enhanced scan complete. Found ${defaultStrings.length} default strings, ${availableLanguages.length} language(s)`);
      return scanResult;

    } catch (error) {
      console.error(`❌ Error in enhanced scan:`, error);
      if (progressCallback) {
        progressCallback({
          type: 'error',
          message: error instanceof Error ? error.message : 'Scan failed',
          progress: { scannedItems: 0, totalItems: 0, percentage: 0 }
        });
      }
      throw error;
    }
  }

  // Build file tree structure from GitHub tree
  private buildFileTree(githubTree: any[], stringFiles: StringFile[]): FileTreeItem[] {
    const tree: { [path: string]: FileTreeItem } = {};
    const stringFilePaths = new Set(stringFiles.map(f => f.path));

    // Create directories and files
    for (const item of githubTree) {
      const pathParts = item.path.split('/');

      // Create directory structure
      for (let i = 0; i < pathParts.length; i++) {
        const currentPath = pathParts.slice(0, i + 1).join('/');
        const isFile = i === pathParts.length - 1 && item.type === 'blob';
        const isStringFile = isFile && this.isStringFile(currentPath);

        if (!tree[currentPath]) {
          tree[currentPath] = {
            name: pathParts[i],
            path: currentPath,
            type: isFile ? 'file' : 'directory',
            status: 'pending',
            children: isFile ? undefined : [],
            isStringFile: isFile ? isStringFile : undefined,
            language: isFile && isStringFile ? this.extractLanguageFromPath(currentPath) : undefined,
            stringCount: isFile && isStringFile ? stringFiles.find(f => f.path === currentPath)?.strings.length : undefined
          };
        }

        // Add to parent directory
        if (i > 0) {
          const parentPath = pathParts.slice(0, i).join('/');
          const parent = tree[parentPath];
          if (parent && parent.children) {
            if (!parent.children.find(child => child.path === currentPath)) {
              parent.children.push(tree[currentPath]);
            }
          }
        }
      }
    }

    // Return root level items, sorted with directories first
    return Object.values(tree)
      .filter(item => !item.path.includes('/'))
      .sort((a, b) => {
        if (a.type !== b.type) {
          return a.type === 'directory' ? -1 : 1;
        }
        return a.name.localeCompare(b.name);
      });
  }

  // Count total items in file tree
  private countFileTreeItems(fileTree: FileTreeItem[]): number {
    let count = 0;

    const countRecursive = (items: FileTreeItem[]) => {
      for (const item of items) {
        count++;
        if (item.children) {
          countRecursive(item.children);
        }
      }
    };

    countRecursive(fileTree);
    return count;
  }

  // Update file status in tree
  private updateFileTreeStatus(
    fileTree: FileTreeItem[],
    filePath: string,
    status: FileTreeItem['status'],
    stringCount?: number,
    error?: string
  ): void {
    const updateRecursive = (items: FileTreeItem[]) => {
      for (const item of items) {
        if (item.path === filePath) {
          item.status = status;
          if (stringCount !== undefined) item.stringCount = stringCount;
          if (error) item.error = error;
          return true;
        }
        if (item.children && updateRecursive(item.children)) {
          return true;
        }
      }
      return false;
    };

    updateRecursive(fileTree);
  }

  // Update directory status based on file activity
  private updateDirectoryStatus(
    fileTree: FileTreeItem[],
    filePath: string,
    status: FileTreeItem['status']
  ): void {
    const pathParts = filePath.split('/');

    // Update all parent directories (only if they're not already marked with a higher priority status)
    for (let i = 1; i < pathParts.length; i++) {
      const dirPath = pathParts.slice(0, i).join('/');

      // Find the directory in the tree
      const dir = this.findItemInTree(fileTree, dirPath);
      if (dir && dir.type === 'directory') {
        // Only update if current status is lower priority than new status
        const statusPriority = { 'pending': 0, 'scanning': 1, 'completed': 2, 'error': 3, 'skipped': 1 };
        const currentPriority = statusPriority[dir.status] || 0;
        const newPriority = statusPriority[status] || 0;

        if (newPriority >= currentPriority) {
          dir.status = status;
        }
      }
    }
  }

  // Helper to find an item in the tree
  private findItemInTree(fileTree: FileTreeItem[], targetPath: string): FileTreeItem | null {
    const findRecursive = (items: FileTreeItem[]): FileTreeItem | null => {
      for (const item of items) {
        if (item.path === targetPath) {
          return item;
        }
        if (item.children) {
          const found = findRecursive(item.children);
          if (found) return found;
        }
      }
      return null;
    };

    return findRecursive(fileTree);
  }

  // Mark all directories as completed when scan finishes
  private markAllDirectoriesCompleted(fileTree: FileTreeItem[]): void {
    const markRecursive = (items: FileTreeItem[]) => {
      for (const item of items) {
        if (item.type === 'directory' && item.status === 'pending') {
          item.status = 'completed';
        }
        if (item.children) {
          markRecursive(item.children);
        }
      }
    };

    markRecursive(fileTree);
  }
}

export { ScanProgressUpdate, FileTreeItem };