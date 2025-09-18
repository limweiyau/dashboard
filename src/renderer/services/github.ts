// GitHub Integration Service
export interface GitHubConfig {
  username: string;
  token?: string;
  defaultBranch: string;
}

export interface Repository {
  name: string;
  fullName: string;
  url: string;
  private: boolean;
  description?: string;
  createdAt: string;
  updatedAt: string;
}

export class GitHubService {
  private config: GitHubConfig;
  private baseUrl = 'https://api.github.com';

  constructor(config: GitHubConfig) {
    this.config = config;
  }

  // Get authentication headers
  private getHeaders(): HeadersInit {
    const headers: HeadersInit = {
      'Accept': 'application/vnd.github.v3+json',
      'Content-Type': 'application/json',
    };

    if (this.config.token) {
      headers['Authorization'] = `token ${this.config.token}`;
    }

    return headers;
  }

  // Create a new repository for a project
  async createRepository(projectName: string, description?: string, isPrivate: boolean = false): Promise<Repository> {
    const response = await fetch(`${this.baseUrl}/user/repos`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        name: projectName.toLowerCase().replace(/\s+/g, '-'),
        description: description || `Dashboard project: ${projectName}`,
        private: isPrivate,
        auto_init: true,
        gitignore_template: 'Node'
      })
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to create repository: ${error.message}`);
    }

    const repo = await response.json();
    return {
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      private: repo.private,
      description: repo.description,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at
    };
  }

  // Get user's repositories
  async getRepositories(): Promise<Repository[]> {
    const response = await fetch(`${this.baseUrl}/user/repos?sort=updated&per_page=100`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Failed to fetch repositories');
    }

    const repos = await response.json();
    return repos.map((repo: any) => ({
      name: repo.name,
      fullName: repo.full_name,
      url: repo.html_url,
      private: repo.private,
      description: repo.description,
      createdAt: repo.created_at,
      updatedAt: repo.updated_at
    }));
  }

  // Upload project data to repository
  async syncProjectData(repoName: string, projectData: any): Promise<void> {
    const content = JSON.stringify(projectData, null, 2);
    const encodedContent = btoa(unescape(encodeURIComponent(content)));

    // Check if file exists first
    let sha: string | undefined;
    try {
      const existingFile = await fetch(
        `${this.baseUrl}/repos/${this.config.username}/${repoName}/contents/project-data.json`,
        { headers: this.getHeaders() }
      );

      if (existingFile.ok) {
        const fileData = await existingFile.json();
        sha = fileData.sha;
      }
    } catch (error) {
      // File doesn't exist, that's fine
    }

    const body: any = {
      message: `Update project data - ${new Date().toISOString()}`,
      content: encodedContent,
      branch: this.config.defaultBranch
    };

    if (sha) {
      body.sha = sha;
    }

    const response = await fetch(
      `${this.baseUrl}/repos/${this.config.username}/${repoName}/contents/project-data.json`,
      {
        method: 'PUT',
        headers: this.getHeaders(),
        body: JSON.stringify(body)
      }
    );

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to sync data: ${error.message}`);
    }
  }

  // Download project data from repository
  async downloadProjectData(repoName: string): Promise<any> {
    const response = await fetch(
      `${this.baseUrl}/repos/${this.config.username}/${repoName}/contents/project-data.json`,
      { headers: this.getHeaders() }
    );

    if (!response.ok) {
      throw new Error('Project data not found in repository');
    }

    const fileData = await response.json();
    const content = atob(fileData.content);
    return JSON.parse(content);
  }

  // Verify GitHub token and get user info
  async verifyToken(): Promise<{ username: string; avatar_url: string }> {
    const response = await fetch(`${this.baseUrl}/user`, {
      headers: this.getHeaders()
    });

    if (!response.ok) {
      throw new Error('Invalid GitHub token');
    }

    const user = await response.json();
    return {
      username: user.login,
      avatar_url: user.avatar_url
    };
  }
}

// Default GitHub service instance for user limweiyau
export const createGitHubService = (token?: string): GitHubService => {
  return new GitHubService({
    username: 'limweiyau',
    token,
    defaultBranch: 'main'
  });
};