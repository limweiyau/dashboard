import React, { useState, useEffect } from 'react';
import { Project, ProjectData, Settings } from '../types';
import SimpleDashboard from './SimpleDashboard';

interface ProjectViewProps {
  project: Project;
  onProjectUpdate: (project: Project) => void;
  onBack: () => void;
  settings: Settings;
}

const ProjectView: React.FC<ProjectViewProps> = ({
  project,
  onProjectUpdate,
  onBack,
  settings
}) => {
  const [projectData, setProjectData] = useState<ProjectData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadProjectData();
  }, [project.id]);

  const loadProjectData = async () => {
    setLoading(true);
    try {
      const data = await window.electronAPI.getProjectData(project.id);
      if (data) {
        // Ensure slicers arrays exist for backwards compatibility
        const normalizedData: ProjectData = {
          ...data,
          slicers: data.slicers || [],
          chartSlicers: data.chartSlicers || [],
          dateRanges: data.dateRanges || []
        };
        setProjectData(normalizedData);
      } else {
        // Initialize empty project data
        const emptyData: ProjectData = {
          id: project.id,
          name: project.name,
          data: [],
          columns: [],
          charts: [],
          dashboards: [],
          tables: [],
          slicers: [],
          chartSlicers: [],
          dateRanges: []
        };
        setProjectData(emptyData);
      }
    } catch (error) {
      console.error('Failed to load project data:', error);
    } finally {
      setLoading(false);
    }
  };

  const saveProjectData = async (updatedData: ProjectData) => {
    try {
      await window.electronAPI.saveProjectData(project.id, updatedData);
      setProjectData(updatedData);
      onProjectUpdate({
        ...project,
        updatedAt: new Date().toISOString()
      });
    } catch (error) {
      console.error('Failed to save project data:', error);
    }
  };


  if (loading) {
    return (
      <div className="loading">
        <div className="spinner"></div>
        Loading project...
      </div>
    );
  }

  if (!projectData) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon">❌</div>
        <h2 className="empty-state-title">Failed to Load Project</h2>
        <p className="empty-state-description">
          There was an error loading the project data.
        </p>
        <button className="btn btn-primary" onClick={onBack}>
          Back to Projects
        </button>
      </div>
    );
  }

  // Directly render the main dashboard interface
  return (
    <SimpleDashboard
      project={project}
      projectData={projectData}
      onProjectUpdate={(updatedData) => {
        setProjectData(updatedData);
        saveProjectData(updatedData);
        onProjectUpdate({
          ...project,
          updatedAt: new Date().toISOString()
        });
      }}
      onBack={onBack}
      settings={settings}
    />
  );
};

export default ProjectView;