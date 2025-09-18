import React, { useState, useEffect } from 'react';
import { Project, ProjectData, Settings } from '../types';
import NewProjectModal from './NewProjectModal';
import GitHubSync from './GitHubSync';

interface ProjectListProps {
  projects: Project[];
  onProjectSelect: (project: Project) => void;
  onProjectsChange: (projects: Project[]) => void;
  settings: Settings;
}

interface ProjectMetrics {
  tables: number;
  charts: number;
  totalRows: number;
}

const ProjectList: React.FC<ProjectListProps> = ({
  projects,
  onProjectSelect,
  onProjectsChange,
  settings
}) => {
  const [showNewProjectModal, setShowNewProjectModal] = useState(false);
  const [projectMetrics, setProjectMetrics] = useState<Record<string, ProjectMetrics>>({});
  const [showGitHubSync, setShowGitHubSync] = useState(false);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProjectData, setSelectedProjectData] = useState<ProjectData | null>(null);

  useEffect(() => {
    loadProjectMetrics();
  }, [projects]);

  const loadProjectMetrics = async () => {
    const metrics: Record<string, ProjectMetrics> = {};

    for (const project of projects) {
      try {
        const projectData = await window.electronAPI.getProjectData(project.id);
        if (projectData) {
          const tableCount = (projectData.tables?.length || 0) + (projectData.data?.length > 0 ? 1 : 0); // main table + additional tables
          const chartCount = projectData.charts?.length || 0;
          const totalRows = (projectData.data?.length || 0) +
            (projectData.tables?.reduce((sum: number, table: any) => sum + (table.data?.length || 0), 0) || 0);

          metrics[project.id] = {
            tables: tableCount,
            charts: chartCount,
            totalRows
          };

          // Update project hasData status based on actual data
          if (tableCount > 0 || chartCount > 0 || totalRows > 0) {
            project.hasData = true;
          }
        } else {
          metrics[project.id] = { tables: 0, charts: 0, totalRows: 0 };
        }
      } catch (error) {
        console.error(`Failed to load metrics for project ${project.id}:`, error);
        metrics[project.id] = { tables: 0, charts: 0, totalRows: 0 };
      }
    }

    setProjectMetrics(metrics);
  };

  const handleNewProject = (projectData: { name: string; description: string }) => {
    const newProject: Project = {
      id: Date.now().toString(),
      name: projectData.name,
      description: projectData.description,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      hasData: false
    };

    const updatedProjects = [...projects, newProject];
    onProjectsChange(updatedProjects);
    setShowNewProjectModal(false);
  };

  const handleDeleteProject = (projectId: string) => {
    if (confirm('Are you sure you want to delete this project? This action cannot be undone.')) {
      const updatedProjects = projects.filter(p => p.id !== projectId);
      onProjectsChange(updatedProjects);
    }
  };

  const handleGitHubSync = async (project: Project) => {
    try {
      const projectData = await window.electronAPI.getProjectData(project.id);
      setSelectedProject(project);
      setSelectedProjectData(projectData);
      setShowGitHubSync(true);
    } catch (error) {
      console.error('Failed to load project data for GitHub sync:', error);
    }
  };

  const handleProjectUpdate = (updatedProject: Project) => {
    const updatedProjects = projects.map(p =>
      p.id === updatedProject.id ? updatedProject : p
    );
    onProjectsChange(updatedProjects);
  };

  if (projects.length === 0) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}>
        <div style={{
          background: 'white',
          borderRadius: '20px',
          padding: '60px 40px',
          textAlign: 'center',
          boxShadow: '0 20px 60px rgba(0, 0, 0, 0.1)',
          maxWidth: '500px',
          width: '100%'
        }}>
          <div style={{
            fontSize: '80px',
            marginBottom: '24px',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            📊
          </div>
          <h2 style={{
            margin: '0 0 16px 0',
            fontSize: '32px',
            fontWeight: '700',
            color: '#1a202c',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            Welcome to DB Studio
          </h2>
          <p style={{
            margin: '0 0 40px 0',
            color: '#718096',
            fontSize: '18px',
            lineHeight: '1.6'
          }}>
            Create your first project to start building beautiful dashboards and visualizations from your data.
          </p>
          <button
            onClick={() => setShowNewProjectModal(true)}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              borderRadius: '50px',
              fontSize: '16px',
              fontWeight: '600',
              cursor: 'pointer',
              boxShadow: '0 10px 30px rgba(102, 126, 234, 0.3)',
              transition: 'all 0.3s ease',
              transform: 'translateY(0px)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-2px)';
              e.currentTarget.style.boxShadow = '0 15px 40px rgba(102, 126, 234, 0.4)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 10px 30px rgba(102, 126, 234, 0.3)';
            }}
          >
            ✨ Create Your First Project
          </button>
        </div>
        
        {showNewProjectModal && (
          <NewProjectModal
            onSubmit={handleNewProject}
            onClose={() => setShowNewProjectModal(false)}
          />
        )}
      </div>
    );
  }

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%)',
      padding: '20px 40px'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '20px',
        background: 'white',
        padding: '24px 32px',
        borderRadius: '16px',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.08)'
      }}>
        <div>
          <h1 style={{
            margin: '0 0 8px 0',
            fontSize: '36px',
            fontWeight: '800',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text'
          }}>
            My Projects
          </h1>
          <p style={{
            margin: 0,
            color: '#718096',
            fontSize: '16px'
          }}>
            {projects.length} project{projects.length !== 1 ? 's' : ''} • Welcome back!
          </p>
        </div>
        <button
          onClick={() => setShowNewProjectModal(true)}
          style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            padding: '14px 28px',
            borderRadius: '50px',
            fontSize: '15px',
            fontWeight: '600',
            cursor: 'pointer',
            boxShadow: '0 8px 25px rgba(102, 126, 234, 0.3)',
            transition: 'all 0.3s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = 'translateY(-2px)';
            e.currentTarget.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.4)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = 'translateY(0px)';
            e.currentTarget.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.3)';
          }}
        >
          <span style={{ fontSize: '18px' }}>+</span> New Project
        </button>
      </div>

      {/* Projects Grid */}
      <div style={{
        display: 'grid',
        gap: '20px',
        gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))'
      }}>
        {projects.map((project, index) => (
          <div
            key={project.id}
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              overflow: 'hidden',
              cursor: 'pointer',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
              transition: 'all 0.3s ease',
              border: '1px solid #f1f5f9',
              position: 'relative'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = 'translateY(-4px)';
              e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.borderColor = '#e2e8f0';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0px)';
              e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
              e.currentTarget.style.borderColor = '#f1f5f9';
            }}
            onClick={() => onProjectSelect(project)}
          >

            {/* Status Bar */}
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              height: '4px',
              marginBottom: '24px'
            }} />

            {/* Main Content */}
            <div style={{ padding: '0 24px 24px 24px' }}>
              {/* Header with Delete Button */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
                marginBottom: '16px'
              }}>
                <div style={{ flex: 1, paddingRight: '16px' }}>
                  <h3 style={{
                    margin: '0 0 6px 0',
                    fontSize: '18px',
                    fontWeight: '700',
                    color: '#0f172a',
                    lineHeight: '1.2'
                  }}>
                    {project.name}
                  </h3>
                  {project.description && (
                    <p style={{
                      margin: 0,
                      color: '#64748b',
                      fontSize: '13px',
                      lineHeight: '1.4',
                      display: '-webkit-box',
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: 'vertical',
                      overflow: 'hidden'
                    }}>
                      {project.description}
                    </p>
                  )}
                </div>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteProject(project.id);
                  }}
                  style={{
                    background: 'none',
                    border: 'none',
                    padding: '4px',
                    borderRadius: '4px',
                    cursor: 'pointer',
                    color: '#94a3b8',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    opacity: 0.6
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#fef2f2';
                    e.currentTarget.style.color = '#dc2626';
                    e.currentTarget.style.opacity = '1';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'none';
                    e.currentTarget.style.color = '#94a3b8';
                    e.currentTarget.style.opacity = '0.6';
                  }}
                  title="Delete Project"
                >
                  ×
                </button>
              </div>

              {/* Metrics in a clean row */}
              <div style={{
                display: 'flex',
                gap: '12px',
                marginBottom: '20px'
              }}>
                <div style={{
                  flex: 1,
                  padding: '16px',
                  background: 'linear-gradient(135deg, #f0f9ff 0%, #e0f2fe 100%)',
                  borderRadius: '8px',
                  border: '1px solid #bae6fd'
                }}>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#0369a1',
                    lineHeight: 1,
                    marginBottom: '4px'
                  }}>
                    {projectMetrics[project.id]?.tables || 0}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#0284c7',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Tables
                  </div>
                </div>

                <div style={{
                  flex: 1,
                  padding: '16px',
                  background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                  borderRadius: '8px',
                  border: '1px solid #bbf7d0'
                }}>
                  <div style={{
                    fontSize: '20px',
                    fontWeight: '700',
                    color: '#059669',
                    lineHeight: 1,
                    marginBottom: '4px'
                  }}>
                    {projectMetrics[project.id]?.charts || 0}
                  </div>
                  <div style={{
                    fontSize: '12px',
                    color: '#047857',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em'
                  }}>
                    Charts
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onProjectSelect(project);
                  }}
                  style={{
                    flex: 1,
                    background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 20px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)';
                    e.currentTarget.style.transform = 'translateY(0px)';
                  }}
                >
                  Open Project
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleGitHubSync(project);
                  }}
                  style={{
                    background: project.github ? 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)' : 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '14px 16px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: '600',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    minWidth: '80px'
                  }}
                  onMouseEnter={(e) => {
                    if (project.github) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)';
                    } else {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #4b5563 0%, #374151 100%)';
                    }
                    e.currentTarget.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    if (project.github) {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #22c55e 0%, #16a34a 100%)';
                    } else {
                      e.currentTarget.style.background = 'linear-gradient(135deg, #6b7280 0%, #4b5563 100%)';
                    }
                    e.currentTarget.style.transform = 'translateY(0px)';
                  }}
                  title={project.github ? `Synced to ${project.github.repoName}` : 'Sync to GitHub'}
                >
                  {project.github ? 'GitHub' : 'Sync'}
                </button>
              </div>

              {/* Footer with dates and status */}
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                paddingTop: '16px',
                borderTop: '1px solid #f1f5f9'
              }}>
                <div style={{
                  display: 'flex',
                  gap: '16px',
                  fontSize: '11px',
                  color: '#64748b'
                }}>
                  <span>
                    Created {new Date(project.createdAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                  <span>•</span>
                  <span>
                    Updated {new Date(project.updatedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </span>
                </div>
                {!project.hasData && (
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '2px 6px',
                    borderRadius: '4px',
                    background: '#fef3c7',
                    fontSize: '10px',
                    fontWeight: '500',
                    color: '#92400e'
                  }}>
                    <div style={{
                      width: '4px',
                      height: '4px',
                      borderRadius: '50%',
                      background: '#f59e0b'
                    }} />
                    Setup Required
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {showNewProjectModal && (
        <NewProjectModal
          onSubmit={handleNewProject}
          onClose={() => setShowNewProjectModal(false)}
        />
      )}

      {showGitHubSync && selectedProject && selectedProjectData && (
        <GitHubSync
          project={selectedProject}
          projectData={selectedProjectData}
          settings={settings}
          onProjectUpdate={handleProjectUpdate}
          onClose={() => {
            setShowGitHubSync(false);
            setSelectedProject(null);
            setSelectedProjectData(null);
          }}
        />
      )}
    </div>
  );
};

export default ProjectList;