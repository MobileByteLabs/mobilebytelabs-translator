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

interface ScanResult {
  defaultStrings: StringResource[];
  existingTranslations: { [language: string]: StringResource[] };
  missingTranslations: { [language: string]: string[] };
  availableLanguages: string[];
  totalStrings: number;
  branches: string[];
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

      return {
        defaultStrings,
        existingTranslations,
        missingTranslations,
        availableLanguages,
        totalStrings: defaultStrings.length,
        branches
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
}