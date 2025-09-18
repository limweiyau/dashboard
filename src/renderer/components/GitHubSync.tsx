import React, { useState } from 'react';
import { Project, ProjectData, Settings } from '../types';
import { createGitHubService } from '../services/github';

interface GitHubSyncProps {
  project: Project;
  projectData: ProjectData;
  settings: Settings;
  onProjectUpdate: (project: Project) => void;
  onClose: () => void;
}

const GitHubSync: React.FC<GitHubSyncProps> = ({
  project,
  projectData,
  settings,
  onProjectUpdate,
  onClose
}) => {
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [repoName, setRepoName] = useState(
    project.github?.repoName || project.name.toLowerCase().replace(/\s+/g, '-')
  );
  const [isPrivate, setIsPrivate] = useState(true);

  const githubService = createGitHubService(settings.github?.token);

  const handleCreateAndSync = async () => {
    if (!settings.github?.token) {
      setMessage('GitHub token not configured. Please go to Settings.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      // Create repository
      setMessage('Creating GitHub repository...');
      const repo = await githubService.createRepository(
        repoName,
        `Dashboard project: ${project.name}\n\nGenerated with Dashboard Studio`,
        isPrivate
      );

      // Sync project data
      setMessage('Syncing project data...');
      await githubService.syncProjectData(repo.name, {
        project,
        data: projectData,
        syncedAt: new Date().toISOString()
      });

      // Update project with GitHub info
      const updatedProject: Project = {
        ...project,
        github: {
          repoName: repo.name,
          repoUrl: repo.url,
          lastSync: new Date().toISOString(),
          autoSync: false
        }
      };

      onProjectUpdate(updatedProject);
      setMessage(`✅ Successfully synced to GitHub: ${repo.url}`);

      setTimeout(() => {
        onClose();
      }, 2000);

    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSyncExisting = async () => {
    if (!settings.github?.token || !project.github?.repoName) {
      setMessage('GitHub not configured for this project.');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      setMessage('Syncing project data...');
      await githubService.syncProjectData(project.github.repoName, {
        project,
        data: projectData,
        syncedAt: new Date().toISOString()
      });

      const updatedProject: Project = {
        ...project,
        github: {
          ...project.github,
          lastSync: new Date().toISOString()
        }
      };

      onProjectUpdate(updatedProject);
      setMessage(`✅ Successfully synced to GitHub`);

      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      setMessage(`❌ Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000
    }}>
      <div style={{
        background: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '480px',
        maxWidth: '90vw'
      }}>
        <h3 style={{
          margin: '0 0 16px 0',
          fontSize: '18px',
          fontWeight: '600',
          color: '#1f2937'
        }}>
          GitHub Integration
        </h3>

        {!project.github ? (
          // New sync setup
          <div>
            <p style={{
              margin: '0 0 16px 0',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              Create a GitHub repository for "{project.name}" and sync your project data.
            </p>

            <div style={{ marginBottom: '16px' }}>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '6px'
              }}>
                Repository Name
              </label>
              <input
                type="text"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
                placeholder="my-dashboard-project"
              />
            </div>

            <div style={{ marginBottom: '20px' }}>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                fontSize: '14px',
                color: '#374151'
              }}>
                <input
                  type="checkbox"
                  checked={isPrivate}
                  onChange={(e) => setIsPrivate(e.target.checked)}
                />
                Private repository
              </label>
            </div>

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleCreateAndSync}
                disabled={isLoading || !repoName.trim()}
                style={{
                  flex: 1,
                  background: '#22c55e',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? 'Creating...' : 'Create & Sync'}
              </button>
              <button
                onClick={onClose}
                disabled={isLoading}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          // Existing sync
          <div>
            <p style={{
              margin: '0 0 16px 0',
              color: '#6b7280',
              fontSize: '14px'
            }}>
              Repository: <strong>{project.github.repoName}</strong>
            </p>

            {project.github.lastSync && (
              <p style={{
                margin: '0 0 16px 0',
                color: '#6b7280',
                fontSize: '12px'
              }}>
                Last synced: {new Date(project.github.lastSync).toLocaleString()}
              </p>
            )}

            <div style={{
              display: 'flex',
              gap: '12px'
            }}>
              <button
                onClick={handleSyncExisting}
                disabled={isLoading}
                style={{
                  flex: 1,
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  opacity: isLoading ? 0.7 : 1
                }}
              >
                {isLoading ? 'Syncing...' : 'Sync Now'}
              </button>
              <a
                href={project.github.repoUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                View Repo
              </a>
              <button
                onClick={onClose}
                disabled={isLoading}
                style={{
                  background: '#6b7280',
                  color: 'white',
                  border: 'none',
                  padding: '12px 16px',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}

        {message && (
          <div style={{
            marginTop: '16px',
            padding: '12px',
            background: message.includes('❌') ? '#fef2f2' : '#f0f9ff',
            border: `1px solid ${message.includes('❌') ? '#fecaca' : '#bfdbfe'}`,
            borderRadius: '6px',
            fontSize: '14px',
            color: message.includes('❌') ? '#dc2626' : '#1e40af'
          }}>
            {message}
          </div>
        )}
      </div>
    </div>
  );
};

export default GitHubSync;