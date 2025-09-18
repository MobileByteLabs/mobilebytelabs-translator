// backend/src/services/githubService.ts
import { Octokit } from '@octokit/rest';

export interface GitHubRepository {
  id: number;
  name: string;
  full_name: string;
  description: string | null;
  private: boolean;
  language: string | null;
  stargazers_count: number;
  forks_count: number;
  updated_at: string;
  default_branch: string;
  size: number;
  languages_url: string;
  clone_url: string;
  html_url: string;
}

export interface ProcessedRepository {
  id: string;
  name: string;
  fullName: string;
  description: string;
  language: string;
  stars: number;
  forks: number;
  lastUpdated: string;
  defaultBranch: string;
  isPrivate: boolean;
  size: number;
  htmlUrl: string;
  cloneUrl: string;
  languages: string[];
  isTranslatable: boolean;
  estimatedStrings: number;
}

export class GitHubService {
  private octokit: Octokit;

  constructor(githubToken: string) {
    this.octokit = new Octokit({
      auth: githubToken,
      userAgent: 'MobileByteLabs-Translation-System/1.0',
    });
  }

  // Get user's repositories
  async getUserRepositories(includePrivate: boolean = true): Promise<ProcessedRepository[]> {
    try {
      console.log('📂 Fetching user repositories...');
      
      const response = await this.octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        direction: 'desc',
        per_page: 50,
        type: includePrivate ? 'all' : 'public',
      });

      console.log(`✅ Found ${response.data.length} repositories`);

      // Process repositories in parallel
      const processedRepos = await Promise.all(
        response.data.map(repo => this.processRepository(repo as GitHubRepository))
      );

      // Filter and sort repositories
      return processedRepos
        .filter(repo => repo.isTranslatable)
        .sort((a, b) => b.stars - a.stars);

    } catch (error) {
      console.error('❌ Error fetching repositories:', error);
      throw new Error('Failed to fetch repositories from GitHub');
    }
  }

  // Get repository languages
  async getRepositoryLanguages(owner: string, repo: string): Promise<string[]> {
    try {
      const response = await this.octokit.rest.repos.listLanguages({
        owner,
        repo,
      });

      return Object.keys(response.data);
    } catch (error) {
      console.error(`❌ Error fetching languages for ${owner}/${repo}:`, error);
      return [];
    }
  }

  // Process individual repository
  private async processRepository(repo: GitHubRepository): Promise<ProcessedRepository> {
    const [owner, name] = repo.full_name.split('/');
    
    // Get detailed language information
    const languages = await this.getRepositoryLanguages(owner, name);
    
    // Determine if repository is suitable for translation
    const isTranslatable = this.isRepositoryTranslatable(repo, languages);
    
    // Estimate number of translatable strings based on repository characteristics
    const estimatedStrings = this.estimateTranslatableStrings(repo, languages);

    return {
      id: repo.id.toString(),
      name: repo.name,
      fullName: repo.full_name,
      description: repo.description || 'No description available',
      language: repo.language || 'Unknown',
      stars: repo.stargazers_count,
      forks: repo.forks_count,
      lastUpdated: repo.updated_at,
      defaultBranch: repo.default_branch,
      isPrivate: repo.private,
      size: repo.size,
      htmlUrl: repo.html_url,
      cloneUrl: repo.clone_url,
      languages,
      isTranslatable,
      estimatedStrings,
    };
  }

  // Determine if repository is suitable for translation
  private isRepositoryTranslatable(repo: GitHubRepository, languages: string[]): boolean {
    // Size check (not too small, not too large)
    if (repo.size < 10 || repo.size > 100000) {
      return false;
    }

    // Check for supported languages
    const supportedLanguages = [
      'JavaScript', 'TypeScript', 'React', 'Vue',
      'Java', 'Kotlin', 'Swift',
      'Python', 'PHP',
      'C#', 'C++',
      'Go', 'Rust',
      'HTML', 'CSS'
    ];

    const hasTranslatableLanguage = languages.some(lang => 
      supportedLanguages.includes(lang)
    );

    if (!hasTranslatableLanguage && !repo.language) {
      return false;
    }

    if (repo.language && !supportedLanguages.includes(repo.language)) {
      return false;
    }

    // Exclude certain repository types
    const excludePatterns = [
      'dotfiles', 'config', 'backup', 'archive',
      'test', 'demo', 'example', 'tutorial',
      'learning', 'practice', 'exercise'
    ];

    const nameOrDescription = `${repo.name} ${repo.description || ''}`.toLowerCase();
    if (excludePatterns.some(pattern => nameOrDescription.includes(pattern))) {
      return false;
    }

    return true;
  }

  // Estimate number of translatable strings
  private estimateTranslatableStrings(repo: GitHubRepository, languages: string[]): number {
    let baseEstimate = 0;

    // Base estimate by primary language
    switch (repo.language) {
      case 'JavaScript':
      case 'TypeScript':
        baseEstimate = Math.floor(repo.size * 0.8); // High string density
        break;
      case 'Java':
      case 'Kotlin':
        baseEstimate = Math.floor(repo.size * 0.6); // Android apps have many strings
        break;
      case 'Swift':
        baseEstimate = Math.floor(repo.size * 0.5); // iOS apps
        break;
      case 'Python':
      case 'PHP':
        baseEstimate = Math.floor(repo.size * 0.4); // Web applications
        break;
      default:
        baseEstimate = Math.floor(repo.size * 0.3);
    }

    // Adjust based on repository characteristics
    if (languages.includes('HTML') || languages.includes('CSS')) {
      baseEstimate += Math.floor(repo.size * 0.2); // UI-heavy apps
    }

    if (repo.name.includes('mobile') || repo.name.includes('app')) {
      baseEstimate += Math.floor(repo.size * 0.3); // Mobile apps have more UI strings
    }

    if (repo.name.includes('web') || repo.name.includes('frontend')) {
      baseEstimate += Math.floor(repo.size * 0.2); // Web apps
    }

    // Apply realistic bounds
    return Math.max(10, Math.min(baseEstimate, 2000));
  }

  // Get repository file structure (for scanning)
  async getRepositoryTree(owner: string, repo: string, branch: string = 'main'): Promise<any[]> {
    try {
      console.log(`🌳 Fetching repository tree for ${owner}/${repo}...`);
      
      const response = await this.octokit.rest.git.getTree({
        owner,
        repo,
        tree_sha: branch,
        recursive: '1', // Get full tree
      });

      return response.data.tree;
    } catch (error) {
      console.error(`❌ Error fetching repository tree:`, error);
      throw new Error('Failed to fetch repository structure');
    }
  }

  // Get file content
  async getFileContent(owner: string, repo: string, path: string, branch: string = 'main'): Promise<string> {
    try {
      const response = await this.octokit.rest.repos.getContent({
        owner,
        repo,
        path,
        ref: branch,
      });

      if ('content' in response.data) {
        return Buffer.from(response.data.content, 'base64').toString('utf-8');
      }
      
      throw new Error('File is not a regular file');
    } catch (error) {
      console.error(`❌ Error fetching file content for ${path}:`, error);
      throw new Error(`Failed to fetch file: ${path}`);
    }
  }

  // Create a branch
  async createBranch(owner: string, repo: string, newBranch: string, baseBranch: string = 'main'): Promise<void> {
    try {
      // Get the SHA of the base branch
      const baseRef = await this.octokit.rest.git.getRef({
        owner,
        repo,
        ref: `heads/${baseBranch}`,
      });

      // Create new branch
      await this.octokit.rest.git.createRef({
        owner,
        repo,
        ref: `refs/heads/${newBranch}`,
        sha: baseRef.data.object.sha,
      });

      console.log(`✅ Created branch: ${newBranch}`);
    } catch (error) {
      console.error(`❌ Error creating branch ${newBranch}:`, error);
      throw new Error(`Failed to create branch: ${newBranch}`);
    }
  }

  // Create or update file
  async createOrUpdateFile(
    owner: string,
    repo: string,
    path: string,
    content: string,
    message: string,
    branch: string = 'main'
  ): Promise<void> {
    try {
      // Check if file exists
      let sha: string | undefined;
      try {
        const existingFile = await this.octokit.rest.repos.getContent({
          owner,
          repo,
          path,
          ref: branch,
        });
        
        if ('sha' in existingFile.data) {
          sha = existingFile.data.sha;
        }
      } catch (error) {
        // File doesn't exist, which is fine
      }

      // Create or update file
      await this.octokit.rest.repos.createOrUpdateFileContents({
        owner,
        repo,
        path,
        message,
        content: Buffer.from(content).toString('base64'),
        branch,
        ...(sha && { sha }),
      });

      console.log(`✅ ${sha ? 'Updated' : 'Created'} file: ${path}`);
    } catch (error) {
      console.error(`❌ Error creating/updating file ${path}:`, error);
      throw new Error(`Failed to create/update file: ${path}`);
    }
  }

  // Create pull request
  async createPullRequest(
    owner: string,
    repo: string,
    title: string,
    body: string,
    head: string,
    base: string = 'main'
  ): Promise<string> {
    try {
      const response = await this.octokit.rest.pulls.create({
        owner,
        repo,
        title,
        body,
        head,
        base,
      });

      console.log(`✅ Created pull request: ${response.data.html_url}`);
      return response.data.html_url;
    } catch (error) {
      console.error(`❌ Error creating pull request:`, error);
      throw new Error('Failed to create pull request');
    }
  }
}