import React from 'react';
import { Project } from '../types';

interface SidebarProps {
  currentView: 'projects' | 'project' | 'settings';
  onViewChange: (view: 'projects' | 'project' | 'settings') => void;
  selectedProject: Project | null;
  apiConnected: boolean;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  selectedProject,
  apiConnected
}) => {
  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h1 className="sidebar-title">DB Studio</h1>
        <div className={`api-status ${apiConnected ? 'connected' : 'disconnected'}`}>
          <div className="status-dot"></div>
          API {apiConnected ? 'Connected' : 'Disconnected'}
        </div>
      </div>
      
      <div className="sidebar-content">
        <nav>
          <button
            className={`btn ${currentView === 'projects' ? 'btn-primary' : 'btn-secondary'} mb-2`}
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => onViewChange('projects')}
          >
            📁 Projects
          </button>
          
          {selectedProject && (
            <button
              className={`btn ${currentView === 'project' ? 'btn-primary' : 'btn-secondary'} mb-2`}
              style={{ width: '100%', justifyContent: 'flex-start' }}
              onClick={() => onViewChange('project')}
            >
              📊 {selectedProject.name}
            </button>
          )}
          
          <button
            className={`btn ${currentView === 'settings' ? 'btn-primary' : 'btn-secondary'} mb-2`}
            style={{ width: '100%', justifyContent: 'flex-start' }}
            onClick={() => onViewChange('settings')}
          >
            ⚙️ Settings
          </button>
        </nav>
        
        {currentView === 'project' && selectedProject && (
          <div style={{ marginTop: '24px' }}>
            <h3 style={{ fontSize: '14px', fontWeight: '600', marginBottom: '12px', color: '#86868b' }}>
              PROJECT INFO
            </h3>
            <div className="card">
              <div className="card-title" style={{ fontSize: '14px' }}>{selectedProject.name}</div>
              {selectedProject.description && (
                <div className="card-description" style={{ fontSize: '12px' }}>
                  {selectedProject.description}
                </div>
              )}
              <div style={{ marginTop: '12px', fontSize: '12px', color: '#86868b' }}>
                <div>Created: {new Date(selectedProject.createdAt).toLocaleDateString()}</div>
                <div>Updated: {new Date(selectedProject.updatedAt).toLocaleDateString()}</div>
                <div>Data: {selectedProject.hasData ? '✅ Loaded' : '❌ No Data'}</div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Sidebar;