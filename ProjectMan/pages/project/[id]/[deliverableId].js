import React, { useState, useEffect } from 'react';
import Head from 'next/head';
import { useRouter } from 'next/router';
import { supabase } from '../../../lib/supabaseClient';
import HeaderParti from '../../../components/HeaderParti';

const STATUS_OPTIONS = ['draft', 'in_review', 'validated', 'archived'];

const STATUS_COLORS = {
  draft: '#9ca3af',
  in_review: '#fbbf24',
  validated: '#10b981',
  archived: '#6b7280'
};

export default function DeliverablePage() {
  const router = useRouter();
  const { id: projectId, deliverableId } = router.query;

  const [deliverable, setDeliverable] = useState(null);
  const [project, setProject] = useState(null);
  const [deliverableType, setDeliverableType] = useState(null);
  const [comments, setComments] = useState([]);
  const [attachments, setAttachments] = useState([]);
  const [versions, setVersions] = useState([]);
  const [allDeliverables, setAllDeliverables] = useState([]);
  const [content, setContent] = useState('');
  const [newComment, setNewComment] = useState('');
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (projectId && deliverableId) {
      loadData();
    }
  }, [projectId, deliverableId]);

  async function loadData() {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('auth_id', session.user.id)
        .single();
      
      setCurrentUser(userData);

      // Load deliverable
      const { data: deliverableData } = await supabase
        .from('deliverables')
        .select(`
          *,
          deliverable_type:deliverable_types!deliverables_type_id_fkey(*),
          creator_user:users!deliverables_created_by_fkey(id, full_name),
          assignee_user:users!deliverables_assigned_to_fkey(id, full_name),
          template_info:deliverable_templates(id, name)
        `)
        .eq('id', deliverableId)
        .single();

      if (deliverableData) {
        setDeliverable(deliverableData);
        setDeliverableType(deliverableData.deliverable_type);
        // Use 'content' field first, fallback to 'data' field
        const contentData = deliverableData.content || deliverableData.data || {};
        setContent(JSON.stringify(contentData, null, 2));
      }

      // Load project
      const { data: projectData } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
      
      setProject(projectData);

      // Load all deliverables for this project (for left panel)
      const { data: allDelivsData } = await supabase
        .from('deliverables')
        .select(`
          *,
          deliverable_type:deliverable_types!deliverables_type_id_fkey(id, name, phase_id)
        `)
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });
      
      setAllDeliverables(allDelivsData || []);

      // Load comments
      const { data: commentsData } = await supabase
        .from('deliverable_comments')
        .select(`
          *,
          creator_user:users!deliverable_comments_created_by_fkey(id, full_name)
        `)
        .eq('deliverable_id', deliverableId)
        .order('created_at', { ascending: false });
      
      setComments(commentsData || []);

      // Load attachments
      const { data: attachmentsData } = await supabase
        .from('deliverable_attachments')
        .select(`
          *,
          uploader_user:users!deliverable_attachments_uploaded_by_fkey(id, full_name)
        `)
        .eq('deliverable_id', deliverableId)
        .order('created_at', { ascending: false });
      
      setAttachments(attachmentsData || []);

      // Load versions
      const { data: versionsData } = await supabase
        .from('deliverable_versions')
        .select(`
          *,
          updater_user:users!deliverable_versions_updated_by_fkey(id, full_name)
        `)
        .eq('deliverable_id', deliverableId)
        .order('version_number', { ascending: false });
      
      setVersions(versionsData || []);

      setLoading(false);
    } catch (error) {
      console.error('Error loading data:', error);
      setLoading(false);
    }
  }

  const handleSave = async () => {
    setSaving(true);
    try {
      let parsedContent = {};
      try {
        parsedContent = JSON.parse(content);
      } catch (e) {
        parsedContent = { text: content };
      }

      // Update deliverable - update both 'content' and 'data' fields for compatibility
      const { error } = await supabase
        .from('deliverables')
        .update({
          content: parsedContent,
          data: parsedContent,
          updated_at: new Date().toISOString()
        })
        .eq('id', deliverableId);

      if (error) throw error;

      // Create version
      const latestVersion = versions.length > 0 ? versions[0].version_number : 0;
      await supabase
        .from('deliverable_versions')
        .insert({
          deliverable_id: deliverableId,
          version_number: latestVersion + 1,
          content: parsedContent,
          updated_by: currentUser.id
        });

      await loadData();
      alert('Saved successfully!');
    } catch (error) {
      console.error('Error saving:', error);
      alert('Error saving: ' + error.message);
    }
    setSaving(false);
  };

  const handleStatusChange = async (newStatus) => {
    try {
      const { error } = await supabase
        .from('deliverables')
        .update({ status: newStatus })
        .eq('id', deliverableId);

      if (error) throw error;
      await loadData();
    } catch (error) {
      console.error('Error updating status:', error);
    }
  };

  const handleAddComment = async () => {
    if (!newComment.trim()) return;
    
    try {
      const { error } = await supabase
        .from('deliverable_comments')
        .insert({
          deliverable_id: deliverableId,
          created_by: currentUser.id,
          content: newComment
        });

      if (error) throw error;
      
      setNewComment('');
      await loadData();
    } catch (error) {
      console.error('Error adding comment:', error);
    }
  };

  const handleExportPDF = () => {
    alert('PDF export functionality - to be implemented');
  };

  const handleShare = () => {
    alert('Share functionality - to be implemented');
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner}></div>
        <p>Loading...</p>
      </div>
    );
  }

  if (!deliverable || !project) {
    return <div style={styles.errorContainer}>Deliverable not found</div>;
  }

  return (
    <>
      <Head>
        <title>{deliverable.title} - {project.name}</title>
        <style>{`
          * { scroll-behavior: smooth; }
          body { margin: 0; padding: 0; overflow-x: hidden; }
          ::-webkit-scrollbar { width: 10px; height: 10px; }
          ::-webkit-scrollbar-track { background: #f1f5f9; border-radius: 10px; }
          ::-webkit-scrollbar-thumb { background: #cbd5e1; border-radius: 10px; }
          ::-webkit-scrollbar-thumb:hover { background: #94a3b8; }
        `}</style>
      </Head>

      <HeaderParti />

      <div style={styles.container}>
        {/* HEADER */}
        <header style={styles.header}>
          <div style={styles.headerLeft}>
            <button 
              style={styles.backButton} 
              onClick={() => router.push(`/project/${projectId}`)}
            >
              ← Back to Project
            </button>
            <div style={styles.breadcrumb}>
              <span style={styles.breadcrumbProject}>{project.name}</span>
              <span style={styles.breadcrumbSeparator}>/</span>
              <span style={styles.breadcrumbDeliverable}>{deliverable.title}</span>
            </div>
          </div>
          
          <div style={styles.headerRight}>
            <button 
              style={styles.saveButton}
              onClick={handleSave}
              disabled={saving}
            >
              💾 {saving ? 'Saving...' : 'Save'}
            </button>
            <button style={styles.exportButton} onClick={handleExportPDF}>
              📥 Export PDF
            </button>
            <button style={styles.shareButton} onClick={handleShare}>
              🔗 Share
            </button>
          </div>
        </header>

        {/* MAIN LAYOUT: 3 COLUMNS */}
        <div style={styles.mainLayout}>
          {/* LEFT PANEL: All Deliverables */}
          <div style={styles.leftPanel}>
            <h3 style={styles.panelTitle}>📂 All Deliverables</h3>
            <div style={styles.deliverablesList}>
              {allDeliverables.map((deliv) => (
                <div
                  key={deliv.id}
                  style={{
                    ...styles.deliverableItem,
                    backgroundColor: deliv.id === deliverableId ? '#dbeafe' : '#ffffff',
                    borderLeft: deliv.id === deliverableId ? '4px solid #3b82f6' : '4px solid transparent'
                  }}
                  onClick={() => router.push(`/project/${projectId}/${deliv.id}`)}
                >
                  <div style={styles.delivIcon}>
                    {deliv.status === 'validated' ? '✅' : '📄'}
                  </div>
                  <div>
                    <div style={styles.delivName}>{deliv.title}</div>
                    <div style={{
                      ...styles.delivStatus,
                      color: STATUS_COLORS[deliv.status]
                    }}>
                      {deliv.status}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* MAIN CONTENT: Editor */}
          <div style={styles.mainContent}>
            <div style={styles.editorContainer}>
              <div style={styles.editorHeader}>
                <h1 style={styles.deliverableTitle}>{deliverable.title}</h1>
                <p style={styles.deliverableTypeLabel}>
                  Type: {deliverableType?.name}
                </p>
              </div>
              
              <textarea
                style={styles.editor}
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Start typing your content here... (JSON format or plain text)"
              />
            </div>
          </div>

          {/* RIGHT PANEL: Metadata */}
          <div style={styles.rightPanel}>
            <h3 style={styles.panelTitle}>📊 Metadata</h3>
            
            <div style={styles.metadataSection}>
              <div style={styles.metadataLabel}>Status</div>
              <select 
                style={{
                  ...styles.statusSelect,
                  backgroundColor: STATUS_COLORS[deliverable.status],
                  color: '#ffffff'
                }}
                value={deliverable.status}
                onChange={(e) => handleStatusChange(e.target.value)}
              >
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            <div style={styles.metadataSection}>
              <div style={styles.metadataLabel}>Owner</div>
              <div style={styles.metadataValue}>{deliverable.creator_user?.full_name || 'N/A'}</div>
            </div>

            <div style={styles.metadataSection}>
              <div style={styles.metadataLabel}>Assigned To</div>
              <div style={styles.metadataValue}>{deliverable.assignee_user?.full_name || 'Unassigned'}</div>
            </div>

            <div style={styles.metadataSection}>
              <div style={styles.metadataLabel}>Created</div>
              <div style={styles.metadataValue}>
                {new Date(deliverable.created_at).toLocaleDateString()}
              </div>
            </div>

            <div style={styles.metadataSection}>
              <div style={styles.metadataLabel}>Last Updated</div>
              <div style={styles.metadataValue}>
                {new Date(deliverable.updated_at).toLocaleDateString()}
              </div>
            </div>

            <div style={styles.metadataSection}>
              <div style={styles.metadataLabel}>Version</div>
              <div style={styles.metadataValue}>
                v{versions.length > 0 ? versions[0].version_number : '1.0'}
              </div>
            </div>

            {deliverable.template_info && (
              <div style={styles.metadataSection}>
                <div style={styles.metadataLabel}>Template Used</div>
                <div style={styles.metadataValue}>{deliverable.template_info.name}</div>
              </div>
            )}

            <div style={styles.metadataSection}>
              <div style={styles.metadataLabel}>Attachments ({attachments.length})</div>
              {attachments.map(att => (
                <div key={att.id} style={styles.attachmentItem}>
                  📎 {att.file_name}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* BOTTOM BAR: Comments & History */}
        <div style={styles.bottomBar}>
          <div style={styles.bottomSection}>
            <h3 style={styles.bottomTitle}>💬 Comments ({comments.length})</h3>
            <div style={styles.commentsContainer}>
              {comments.map(comment => (
                <div key={comment.id} style={styles.commentItem}>
                  <div style={styles.commentAuthor}>{comment.creator_user?.full_name || 'Unknown'}</div>
                  <div style={styles.commentContent}>{comment.content}</div>
                  <div style={styles.commentDate}>
                    {new Date(comment.created_at).toLocaleString()}
                  </div>
                </div>
              ))}
            </div>
            <div style={styles.addCommentContainer}>
              <input
                type="text"
                style={styles.commentInput}
                placeholder="Add a comment..."
                value={newComment}
                onChange={(e) => setNewComment(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleAddComment()}
              />
              <button style={styles.addCommentBtn} onClick={handleAddComment}>
                Send
              </button>
            </div>
          </div>

          <div style={styles.bottomSection}>
            <h3 style={styles.bottomTitle}>📜 Version History ({versions.length})</h3>
            <div style={styles.versionsContainer}>
              {versions.map(version => (
                <div key={version.id} style={styles.versionItem}>
                  <div style={styles.versionNumber}>v{version.version_number}</div>
                  <div style={styles.versionInfo}>
                    <div>{version.updater_user?.full_name || 'Unknown'}</div>
                    <div style={styles.versionDate}>
                      {new Date(version.created_at).toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

const styles = {
  container: {
    minHeight: '100vh',
    backgroundColor: '#f8fafc',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
  },
  header: {
    backgroundColor: '#ffffff',
    borderBottom: '2px solid #e2e8f0',
    padding: '1.5rem 2.5rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1)',
    position: 'sticky',
    top: 0,
    zIndex: 10
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  headerRight: {
    display: 'flex',
    gap: '0.75rem'
  },
  backButton: {
    backgroundColor: '#f1f5f9',
    border: 'none',
    color: '#3b82f6',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    padding: '0.625rem 1rem',
    borderRadius: '8px',
    transition: 'all 0.2s'
  },
  breadcrumb: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    fontSize: '0.9375rem'
  },
  breadcrumbProject: {
    color: '#64748b',
    fontWeight: '500'
  },
  breadcrumbSeparator: {
    color: '#cbd5e1'
  },
  breadcrumbDeliverable: {
    color: '#1e293b',
    fontWeight: '700'
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s',
    boxShadow: '0 2px 4px rgba(59, 130, 246, 0.2)'
  },
  exportButton: {
    backgroundColor: '#ffffff',
    color: '#64748b',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  shareButton: {
    backgroundColor: '#ffffff',
    color: '#64748b',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.9rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.2s'
  },
  mainLayout: {
    display: 'grid',
    gridTemplateColumns: '280px 1fr 320px',
    gap: '1.5rem',
    padding: '2rem 2.5rem',
    minHeight: 'calc(100vh - 300px)'
  },
  leftPanel: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '2px solid #e2e8f0',
    padding: '1.5rem',
    maxHeight: 'calc(100vh - 200px)',
    position: 'sticky',
    top: '120px',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column'
  },
  panelTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 1rem 0'
  },
  deliverablesList: {
    flex: 1,
    overflowY: 'auto'
  },
  deliverableItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem',
    padding: '0.875rem',
    borderRadius: '10px',
    cursor: 'pointer',
    marginBottom: '0.5rem',
    transition: 'all 0.2s',
    border: '1px solid #e2e8f0'
  },
  delivIcon: {
    fontSize: '1.25rem'
  },
  delivName: {
    fontSize: '0.875rem',
    fontWeight: '600',
    color: '#1e293b'
  },
  delivStatus: {
    fontSize: '0.75rem',
    fontWeight: '500',
    textTransform: 'capitalize'
  },
  mainContent: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '2px solid #e2e8f0',
    padding: '2rem',
    minHeight: '600px'
  },
  editorContainer: {
    height: '100%',
    display: 'flex',
    flexDirection: 'column'
  },
  editorHeader: {
    marginBottom: '2rem'
  },
  deliverableTitle: {
    fontSize: '2rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 0.5rem 0'
  },
  deliverableTypeLabel: {
    fontSize: '0.9375rem',
    color: '#64748b',
    margin: 0
  },
  editor: {
    flex: 1,
    width: '100%',
    border: '2px solid #e2e8f0',
    borderRadius: '12px',
    padding: '1.5rem',
    fontSize: '1rem',
    fontFamily: 'monospace',
    resize: 'vertical',
    minHeight: '400px'
  },
  rightPanel: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '2px solid #e2e8f0',
    padding: '1.5rem',
    maxHeight: 'calc(100vh - 200px)',
    position: 'sticky',
    top: '120px',
    overflowY: 'auto'
  },
  metadataSection: {
    marginBottom: '1.5rem'
  },
  metadataLabel: {
    fontSize: '0.8125rem',
    fontWeight: '700',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: '0.05em',
    marginBottom: '0.5rem'
  },
  metadataValue: {
    fontSize: '0.9375rem',
    color: '#1e293b',
    fontWeight: '500'
  },
  statusSelect: {
    width: '100%',
    padding: '0.625rem',
    borderRadius: '8px',
    border: 'none',
    fontSize: '0.875rem',
    fontWeight: '600',
    textTransform: 'capitalize',
    cursor: 'pointer'
  },
  attachmentItem: {
    fontSize: '0.875rem',
    color: '#64748b',
    padding: '0.5rem',
    backgroundColor: '#f8fafc',
    borderRadius: '6px',
    marginTop: '0.5rem'
  },
  bottomBar: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1.5rem',
    padding: '0 2.5rem 2rem',
    marginTop: '1rem'
  },
  bottomSection: {
    backgroundColor: '#ffffff',
    borderRadius: '16px',
    border: '2px solid #e2e8f0',
    padding: '1.5rem'
  },
  bottomTitle: {
    fontSize: '1rem',
    fontWeight: '700',
    color: '#1e293b',
    margin: '0 0 1rem 0'
  },
  commentsContainer: {
    maxHeight: '200px',
    overflowY: 'auto',
    marginBottom: '1rem'
  },
  commentItem: {
    padding: '0.875rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    marginBottom: '0.75rem'
  },
  commentAuthor: {
    fontSize: '0.8125rem',
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: '0.25rem'
  },
  commentContent: {
    fontSize: '0.875rem',
    color: '#475569',
    marginBottom: '0.25rem'
  },
  commentDate: {
    fontSize: '0.75rem',
    color: '#94a3b8'
  },
  addCommentContainer: {
    display: 'flex',
    gap: '0.75rem'
  },
  commentInput: {
    flex: 1,
    padding: '0.75rem',
    border: '2px solid #e2e8f0',
    borderRadius: '10px',
    fontSize: '0.875rem'
  },
  addCommentBtn: {
    backgroundColor: '#3b82f6',
    color: '#ffffff',
    border: 'none',
    borderRadius: '10px',
    padding: '0.75rem 1.5rem',
    fontSize: '0.875rem',
    fontWeight: '600',
    cursor: 'pointer'
  },
  versionsContainer: {
    maxHeight: '200px',
    overflowY: 'auto'
  },
  versionItem: {
    display: 'flex',
    gap: '1rem',
    padding: '0.875rem',
    backgroundColor: '#f8fafc',
    borderRadius: '10px',
    marginBottom: '0.75rem'
  },
  versionNumber: {
    fontSize: '0.875rem',
    fontWeight: '700',
    color: '#3b82f6'
  },
  versionInfo: {
    flex: 1
  },
  versionDate: {
    fontSize: '0.75rem',
    color: '#94a3b8'
  },
  loadingContainer: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh'
  },
  spinner: {
    width: '40px',
    height: '40px',
    border: '4px solid #e5e7eb',
    borderTop: '4px solid #3b82f6',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
    marginBottom: '1rem'
  },
  errorContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: '100vh',
    fontSize: '1.125rem',
    color: '#6b7280'
  }
};
