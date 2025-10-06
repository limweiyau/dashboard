import React, { useState } from 'react';
import { Project } from '../types';

interface SidebarProps {
  currentView: 'projects' | 'project' | 'settings';
  onViewChange: (view: 'projects' | 'project' | 'settings') => void;
  selectedProject: Project | null;
  apiConnected: boolean;
  onProjectNameUpdate?: (projectId: string, newName: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({
  currentView,
  onViewChange,
  selectedProject,
  apiConnected,
  onProjectNameUpdate
}) => {
  const [isEditingName, setIsEditingName] = useState(false);
  const [editedName, setEditedName] = useState('');

  const handleStartEdit = () => {
    if (selectedProject) {
      setEditedName(selectedProject.name);
      setIsEditingName(true);
    }
  };

  const handleSaveName = () => {
    if (selectedProject && editedName.trim() && editedName !== selectedProject.name) {
      onProjectNameUpdate?.(selectedProject.id, editedName.trim());
    }
    setIsEditingName(false);
  };

  const handleCancelEdit = () => {
    setIsEditingName(false);
    setEditedName('');
  };
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
              {isEditingName ? (
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    value={editedName}
                    onChange={(e) => setEditedName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSaveName();
                      if (e.key === 'Escape') handleCancelEdit();
                    }}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      border: '2px solid #3b82f6',
                      borderRadius: '6px',
                      outline: 'none'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
                    <button
                      onClick={handleSaveName}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Save
                    </button>
                    <button
                      onClick={handleCancelEdit}
                      style={{
                        flex: 1,
                        padding: '6px 12px',
                        fontSize: '12px',
                        background: '#e5e7eb',
                        color: '#374151',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div
                  onClick={handleStartEdit}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    cursor: 'pointer',
                    padding: '4px',
                    borderRadius: '4px',
                    marginBottom: '4px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => (e.currentTarget.style.background = '#f3f4f6')}
                  onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
                >
                  <div className="card-title" style={{ fontSize: '14px', margin: 0 }}>{selectedProject.name}</div>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                    <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                    <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                  </svg>
                </div>
              )}
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