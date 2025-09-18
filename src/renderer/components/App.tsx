import React, { useState, useEffect } from 'react';
import { Routes, Route } from 'react-router-dom';
import Sidebar from './Sidebar';
import ProjectList from './ProjectList';
import ProjectView from './ProjectView';
import Settings from './Settings';
import { Project, Settings as SettingsType } from '../types';

const App: React.FC = () => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [currentView, setCurrentView] = useState<'projects' | 'project' | 'settings'>('projects');
  const [settings, setSettings] = useState<SettingsType>({
    apiKeys: {},
    connectedApis: {},
    selectedModels: { gemini: 'gemini-2.5-flash' }
  });
  const [loading, setLoading] = useState(true);


  useEffect(() => {
    loadProjects();
    loadSettings();
    
    // Set up menu listeners
    window.electronAPI.onMenuAction((action: string) => {
      switch (action) {
        case 'new-project':
          setCurrentView('projects');
          // Trigger new project modal
          break;
        case 'open-project':
          setCurrentView('projects');
          break;
        case 'settings':
          setCurrentView('settings');
          break;
      }
    });

    return () => {
      window.electronAPI.removeAllListeners('menu-new-project');
      window.electronAPI.removeAllListeners('menu-open-project');
      window.electronAPI.removeAllListeners('menu-settings');
    };
  }, []);

  const loadProjects = async () => {
    try {
      const loadedProjects = await window.electronAPI.getProjects();
      setProjects(loadedProjects);
    } catch (error) {
      console.error('Failed to load projects:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadSettings = async () => {
    try {
      const loadedSettings = await window.electronAPI.getSettings();
      setSettings({
        apiKeys: loadedSettings.apiKeys || {},
        connectedApis: loadedSettings.connectedApis || {},
        selectedModels: loadedSettings.selectedModels || { gemini: 'gemini-2.5-flash' }
      });
    } catch (error) {
      console.error('Failed to load settings:', error);
    }
  };

  const saveProjects = async (updatedProjects: Project[]) => {
    try {
      await window.electronAPI.saveProjects(updatedProjects);
      setProjects(updatedProjects);
      
      // If the currently selected project was deleted, clear it
      if (selectedProject && !updatedProjects.find(p => p.id === selectedProject.id)) {
        setSelectedProject(null);
        setCurrentView('projects');
      }
    } catch (error) {
      console.error('Failed to save projects:', error);
    }
  };

  const saveSettings = async (updatedSettings: SettingsType) => {
    try {
      await window.electronAPI.saveSettings(updatedSettings);
      setSettings(updatedSettings);
    } catch (error) {
      console.error('Failed to save settings:', error);
    }
  };

  const handleProjectSelect = (project: Project) => {
    setSelectedProject(project);
    setCurrentView('project');
  };

  const renderMainContent = () => {
    if (loading) {
      return (
        <div className="loading">
          <div className="spinner"></div>
          Loading...
        </div>
      );
    }

    switch (currentView) {
      case 'projects':
        return (
          <ProjectList
            projects={projects}
            onProjectSelect={handleProjectSelect}
            onProjectsChange={saveProjects}
            settings={settings}
          />
        );
      case 'project':
        return selectedProject ? (
          <ProjectView
            project={selectedProject}
            onProjectUpdate={(updatedProject) => {
              const updatedProjects = projects.map(p =>
                p.id === updatedProject.id ? updatedProject : p
              );
              saveProjects(updatedProjects);
              setSelectedProject(updatedProject);
            }}
            onBack={() => setCurrentView('projects')}
            settings={settings}
          />
        ) : null;
      case 'settings':
        return (
          <Settings
            settings={settings}
            onSettingsChange={saveSettings}
            onBack={() => setCurrentView('projects')}
          />
        );
      default:
        return null;
    }
  };

  return (
    <div className="app">
      {/* Top Navigation Bar */}
      <nav style={{
        background: '#ffffff',
        borderBottom: '1px solid #e5e7eb',
        padding: '36px 24px 16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        zIndex: 1000
      }}>
        {/* Left side - Logo and navigation */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '32px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: '700',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              backgroundClip: 'text'
            }}>
              ⬛ DB Studio
            </h1>
          </div>
          
          {/* Navigation buttons */}
          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={() => setCurrentView('projects')}
              style={{
                background: currentView === 'projects' ? '#3b82f6' : 'transparent',
                color: currentView === 'projects' ? '#ffffff' : '#6b7280',
                border: currentView === 'projects' ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                padding: '8px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                if (currentView !== 'projects') {
                  e.currentTarget.style.background = '#e5e7eb';
                  e.currentTarget.style.color = '#374151';
                }
              }}
              onMouseLeave={(e) => {
                if (currentView !== 'projects') {
                  e.currentTarget.style.background = 'transparent';
                  e.currentTarget.style.color = '#6b7280';
                }
              }}
            >
              Projects
            </button>
            {selectedProject && (
              <button
                onClick={() => setCurrentView('project')}
                style={{
                  background: currentView === 'project' ? '#3b82f6' : 'transparent',
                  color: currentView === 'project' ? '#ffffff' : '#6b7280',
                  border: currentView === 'project' ? '1px solid #3b82f6' : '1px solid #e5e7eb',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (currentView !== 'project') {
                    e.currentTarget.style.background = '#e5e7eb';
                    e.currentTarget.style.color = '#374151';
                  }
                }}
                onMouseLeave={(e) => {
                  if (currentView !== 'project') {
                    e.currentTarget.style.background = 'transparent';
                    e.currentTarget.style.color = '#6b7280';
                  }
                }}
              >
                {selectedProject.name}
              </button>
            )}
          </div>
        </div>

        {/* Right side - API Status and Settings */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {/* API Status */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 8px',
            borderRadius: '12px',
            background: Object.values(settings.connectedApis).some(Boolean) ? '#f0fdf4' : '#fefce8',
            border: Object.values(settings.connectedApis).some(Boolean) ? '1px solid #bbf7d0' : '1px solid #fde68a'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: Object.values(settings.connectedApis).some(Boolean) ? '#15803d' : '#b45309'
            }} />
            <span style={{
              fontSize: '11px',
              fontWeight: '600',
              color: Object.values(settings.connectedApis).some(Boolean) ? '#15803d' : '#b45309'
            }}>
              API {Object.values(settings.connectedApis).some(Boolean) ? 'Connected' : 'Disconnected'}
            </span>
          </div>

          {/* Settings Button */}
          <button
            onClick={() => setCurrentView('settings')}
            style={{
              background: currentView === 'settings' ? '#3b82f6' : 'transparent',
              color: currentView === 'settings' ? '#ffffff' : '#6b7280',
              border: currentView === 'settings' ? '1px solid #3b82f6' : '1px solid #e5e7eb',
              padding: '8px 16px',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '500',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              if (currentView !== 'settings') {
                e.currentTarget.style.background = '#e5e7eb';
                e.currentTarget.style.color = '#374151';
              }
            }}
            onMouseLeave={(e) => {
              if (currentView !== 'settings') {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = '#6b7280';
              }
            }}
          >
            ⚙️ Settings
          </button>
        </div>
      </nav>

      {/* Full-width main content */}
      <main style={{
        flex: 1,
        background: '#ffffff',
        overflow: 'auto'
      }}>
        {renderMainContent()}
      </main>
    </div>
  );
};

export default App;