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
  owner: string;
  isOrganization: boolean;
}

export interface TokenScopeInfo {
  hasRepoScope: boolean;
  hasOrgScope: boolean;
  hasUserEmailScope: boolean;
  scopes: string[];
  canAccessOrganizations: boolean;
}

export class GitHubService {
  private octokit: Octokit;

  constructor(githubToken: string) {
    this.octokit = new Octokit({
      auth: githubToken,
      userAgent: 'MobileByteLabs-Translation-System/1.0',
    });
  }

  // Check token scopes
  async getTokenScopes(): Promise<TokenScopeInfo> {
    try {
      const response = await this.octokit.rest.users.getAuthenticated();
      const scopeHeader = response.headers['x-oauth-scopes'] || '';
      const scopes = scopeHeader.split(',').map(s => s.trim()).filter(s => s);

      return {
        hasRepoScope: scopes.includes('repo') || scopes.includes('public_repo'),
        hasOrgScope: scopes.includes('read:org'),
        hasUserEmailScope: scopes.includes('user:email') || scopes.includes('user'),
        scopes,
        canAccessOrganizations: scopes.includes('read:org'),
      };
    } catch (error) {
      console.error('❌ Error checking token scopes:', error);
      return {
        hasRepoScope: false,
        hasOrgScope: false,
        hasUserEmailScope: false,
        scopes: [],
        canAccessOrganizations: false,
      };
    }
  }

  // Get user's repositories (personal and organization)
  async getUserRepositories(includePrivate: boolean = true): Promise<ProcessedRepository[]> {
    try {
      console.log('📂 Fetching user and organization repositories...');

      // Check token scopes first
      const scopeInfo = await this.getTokenScopes();
      console.log('🔍 Token scopes:', scopeInfo);

      // Fetch personal repositories
      const personalResponse = await this.octokit.rest.repos.listForAuthenticatedUser({
        sort: 'updated',
        direction: 'desc',
        per_page: 100,
        type: includePrivate ? 'all' : 'public',
      });

      console.log(`✅ Found ${personalResponse.data.length} personal repositories`);

      // Fetch organization repositories (this requires read:org scope)
      let orgRepositories: any[] = [];
      if (scopeInfo.canAccessOrganizations) {
        try {
          // Get user's organizations
          const orgsResponse = await this.octokit.rest.orgs.listForAuthenticatedUser({
            per_page: 100,
          });

          console.log(`📋 Found ${orgsResponse.data.length} organizations`);

          // Fetch repositories for each organization
          const orgRepoPromises = orgsResponse.data.map(async (org) => {
            try {
              const orgReposResponse = await this.octokit.rest.repos.listForOrg({
                org: org.login,
                sort: 'updated',
                direction: 'desc',
                per_page: 100,
                type: includePrivate ? 'all' : 'public',
              });
              console.log(`✅ Found ${orgReposResponse.data.length} repositories in ${org.login}`);
              return orgReposResponse.data;
            } catch (error) {
              console.warn(`⚠️ Could not fetch repositories for organization ${org.login}:`, error);
              return [];
            }
          });

          const orgRepoResults = await Promise.all(orgRepoPromises);
          orgRepositories = orgRepoResults.flat();

          console.log(`✅ Found ${orgRepositories.length} total organization repositories`);
        } catch (error) {
          console.warn('⚠️ Could not fetch organization repositories:', error);
        }
      } else {
        console.warn('⚠️ Cannot access organization repositories - missing read:org scope');
      }

      // Combine all repositories and remove duplicates
      const allRepositories = [...personalResponse.data, ...orgRepositories];
      const uniqueRepositories = allRepositories.filter((repo, index, self) =>
        index === self.findIndex(r => r.id === repo.id)
      );

      console.log(`✅ Found ${uniqueRepositories.length} total unique repositories`);

      // Get current user info to determine ownership
      const userResponse = await this.octokit.rest.users.getAuthenticated();
      const currentUser = userResponse.data.login;

      // Process repositories in parallel
      const processedRepos = await Promise.all(
        uniqueRepositories.map(repo => this.processRepository(repo as GitHubRepository, currentUser))
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
  private async processRepository(repo: GitHubRepository, currentUser: string): Promise<ProcessedRepository> {
    const [owner, name] = repo.full_name.split('/');

    // Get detailed language information
    const languages = await this.getRepositoryLanguages(owner, name);

    // Determine if repository is suitable for translation
    const isTranslatable = this.isRepositoryTranslatable(repo, languages);

    // Estimate number of translatable strings based on repository characteristics
    const estimatedStrings = this.estimateTranslatableStrings(repo, languages);

    // Determine if this is an organization repository
    const isOrganization = owner !== currentUser;

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
      owner,
      isOrganization,
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