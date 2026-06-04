import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, Plus, Trash2, Eye, CheckCircle, Clock, AlertCircle, Pause, X, Copy, ChevronDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import CreateTemplateModal from './CreateTemplateModal.jsx';

export default function TemplatesTab({ currentUser }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showInfoBox, setShowInfoBox] = useState(false);
  const [stats, setStats] = useState({ approved: 0, pending: 0, rejected: 0, paused: 0 });

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    setLoading(true);
    try {
      const result = await base44.entities.MessageTemplate.filter({ owner_user_id: currentUser.id });
      setTemplates(result || []);
      calculateStats(result || []);
    } catch (error) {
      console.error('Failed to fetch templates:', error);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (items) => {
    const stats = { approved: 0, pending: 0, rejected: 0, paused: 0 };
    items.forEach(t => {
      if (t.status === 'APPROVED') stats.approved++;
      if (t.status === 'PENDING') stats.pending++;
      if (t.status === 'REJECTED') stats.rejected++;
      if (t.status === 'PAUSED') stats.paused++;
    });
    setStats(stats);
  };

  const handleSync = async () => {
    setSyncing(true);
    try {
      const res = await base44.functions.invoke('syncWhatsAppTemplates', { user_id: currentUser.id });
      if (res.data.success) {
        setLastSynced(new Date());
        fetchTemplates();
      }
    } catch (error) {
      console.error('Sync failed:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleRefreshStatus = async (template) => {
    try {
      const res = await base44.functions.invoke('checkTemplateStatus', {
        user_id: currentUser.id,
        template_name: template.template_name
      });
      if (res.data.success) {
        setTemplates(prev => prev.map(t => 
          t.id === template.id ? { ...t, status: res.data.status, rejection_reason: res.data.rejection_reason } : t
        ));
        setSelectedTemplate(prev => prev ? { ...prev, status: res.data.status } : null);
      }
    } catch (error) {
      console.error('Status check failed:', error);
    }
  };

  const handleDelete = async (template) => {
    if (!confirm(`Delete template "${template.display_name}"?`)) return;
    try {
      const res = await base44.functions.invoke('deleteWhatsAppTemplate', {
        user_id: currentUser.id,
        template_name: template.template_name
      });
      if (res.data.success) {
        setTemplates(prev => prev.filter(t => t.id !== template.id));
        setShowDetailModal(false);
      }
    } catch (error) {
      console.error('Delete failed:', error);
    }
  };

  const filteredTemplates = templates.filter(t => 
    filter === 'all' || t.status === filter.toUpperCase()
  );

  const statusBadgeColor = {
    APPROVED: 'bg-emerald-100 text-emerald-700',
    PENDING: 'bg-amber-100 text-amber-700',
    REJECTED: 'bg-red-100 text-red-700',
    PAUSED: 'bg-orange-100 text-orange-700',
    DISABLED: 'bg-gray-100 text-gray-700'
  };

  const categoryColor = {
    UTILITY: 'bg-blue-100 text-blue-700',
    MARKETING: 'bg-orange-100 text-orange-700',
    AUTHENTICATION: 'bg-purple-100 text-purple-700'
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-start mb-6">
        <div>
          <h2 className="text-2xl font-bold mb-2">Message Templates</h2>
          {lastSynced && (
            <p className="text-sm text-muted-foreground">
              Last synced: {Math.floor((Date.now() - lastSynced) / 60000)} minutes ago
            </p>
          )}
        </div>
        <div className="flex gap-2">
          <Button
            onClick={handleSync}
            disabled={syncing}
            variant="outline"
            className="gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Sync from Meta'}
          </Button>
          <Button onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-3">
        {[
          { label: 'Approved', count: stats.approved, color: 'bg-emerald-50 text-emerald-700' },
          { label: 'Pending', count: stats.pending, color: 'bg-amber-50 text-amber-700' },
          { label: 'Rejected', count: stats.rejected, color: 'bg-red-50 text-red-700' },
          { label: 'Paused', count: stats.paused, color: 'bg-orange-50 text-orange-700' }
        ].map(stat => (
          <div key={stat.label} className={`${stat.color} rounded-lg p-3 text-center`}>
            <p className="text-2xl font-bold">{stat.count}</p>
            <p className="text-xs font-medium">{stat.label}</p>
          </div>
        ))}
      </div>

      {/* Info Box */}
      <Card>
        <CardHeader className="cursor-pointer" onClick={() => setShowInfoBox(!showInfoBox)}>
          <CardTitle className="flex justify-between items-center text-base">
            <span>How Templates Work</span>
            <ChevronDown className={`w-4 h-4 transition-transform ${showInfoBox ? 'rotate-180' : ''}`} />
          </CardTitle>
        </CardHeader>
        {showInfoBox && (
          <CardContent className="text-sm space-y-3 text-muted-foreground">
            <div>
              <p className="font-semibold text-foreground mb-1">WhatsApp 24-hour rule:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Customer messages you → you can reply freely for 24 hours</li>
                <li>You message first (new contact) → you MUST use an approved template</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">How to get templates approved fast:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Use UTILITY for follow-ups, reminders, confirmations — approved in minutes</li>
                <li>Use MARKETING for promotions — takes longer, stricter review</li>
                <li>Avoid URLs, avoid promotional words (FREE, WIN, OFFER) in UTILITY templates</li>
                <li>Keep body text concise and professional</li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-foreground mb-1">If your template is rejected:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Read the rejection reason shown in the template details</li>
                <li>Edit content and resubmit with a slightly different name</li>
                <li>Most common fix: switch category from MARKETING to UTILITY</li>
              </ul>
            </div>
          </CardContent>
        )}
      </Card>

      {/* Filters */}
      <div className="flex gap-2">
        {['all', 'approved', 'pending', 'rejected', 'paused'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-lg font-medium text-sm transition-colors ${
              filter === f
                ? 'bg-primary text-white'
                : 'bg-secondary text-secondary-foreground hover:bg-secondary/80'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Templates Table */}
      {loading ? (
        <div className="text-center py-8 text-muted-foreground">Loading templates...</div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 bg-secondary rounded-lg">
          <p className="text-muted-foreground mb-4">No templates found. Create your first template or sync from Meta.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline" onClick={() => setShowCreateModal(true)}>Create Template</Button>
            <Button variant="outline" onClick={handleSync}>Sync from Meta</Button>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-secondary border-b">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">Name</th>
                <th className="px-4 py-3 text-left font-semibold">Category</th>
                <th className="px-4 py-3 text-left font-semibold">Status</th>
                <th className="px-4 py-3 text-left font-semibold">Variables</th>
                <th className="px-4 py-3 text-left font-semibold">Preview</th>
                <th className="px-4 py-3 text-left font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredTemplates.map(t => (
                <tr key={t.id} className="border-b hover:bg-secondary/50">
                  <td className="px-4 py-3">
                    <div>
                      <p className="font-semibold">{t.display_name}</p>
                      <p className="text-xs text-muted-foreground font-mono">{t.template_name}</p>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={categoryColor[t.category]}>{t.category}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    <Badge className={statusBadgeColor[t.status]}>{t.status}</Badge>
                  </td>
                  <td className="px-4 py-3 text-xs">{t.variable_count || 0} variables</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{t.body_text?.substring(0, 55)}...</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <button
                        onClick={() => {
                          setSelectedTemplate(t);
                          setShowDetailModal(true);
                        }}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleRefreshStatus(t)}
                        className="p-1.5 hover:bg-secondary rounded transition-colors"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(t)}
                        className="p-1.5 hover:bg-red-50 text-red-600 rounded transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <CardHeader className="flex flex-row items-start justify-between border-b pb-4">
              <div>
                <CardTitle>{selectedTemplate.display_name}</CardTitle>
                <div className="flex gap-2 mt-2">
                  <Badge className={statusBadgeColor[selectedTemplate.status]}>{selectedTemplate.status}</Badge>
                  <Badge className={categoryColor[selectedTemplate.category]}>{selectedTemplate.category}</Badge>
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1">
                <X className="w-5 h-5" />
              </button>
            </CardHeader>
            <CardContent className="space-y-6 py-6">
              {/* Template Name */}
              <div>
                <label className="text-sm font-semibold block mb-2">Template Name</label>
                <div className="flex items-center gap-2 bg-gray-100 p-3 rounded font-mono text-sm">
                  {selectedTemplate.template_name}
                  <button
                    onClick={() => navigator.clipboard.writeText(selectedTemplate.template_name)}
                    className="ml-auto p-1 hover:bg-gray-200 rounded"
                  >
                    <Copy className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Header */}
              {selectedTemplate.header_type !== 'NONE' && selectedTemplate.header_text && (
                <div>
                  <label className="text-sm font-semibold block mb-2">Header</label>
                  <div className="bg-gray-100 p-3 rounded text-sm">{selectedTemplate.header_text}</div>
                </div>
              )}

              {/* Body */}
              <div>
                <label className="text-sm font-semibold block mb-2">Body</label>
                <div className="bg-gray-50 p-3 rounded text-sm whitespace-pre-wrap">
                  {selectedTemplate.body_text.split(/(\{\{\d+\}\})/g).map((part, i) =>
                    part.match(/\{\{\d+\}\}/) ? (
                      <span key={i} className="bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded text-xs font-semibold">
                        {part}
                      </span>
                    ) : (
                      part
                    )
                  )}
                </div>
              </div>

              {/* Footer */}
              {selectedTemplate.footer_text && (
                <div>
                  <label className="text-sm font-semibold block mb-2">Footer</label>
                  <div className="text-sm text-muted-foreground">{selectedTemplate.footer_text}</div>
                </div>
              )}

              {/* Buttons */}
              {selectedTemplate.has_buttons && selectedTemplate.buttons_json && (
                <div>
                  <label className="text-sm font-semibold block mb-2">Buttons</label>
                  <div className="flex flex-wrap gap-2">
                    {JSON.parse(selectedTemplate.buttons_json).map((btn, i) => (
                      <button key={i} className="px-3 py-1.5 border border-gray-300 rounded-full text-sm">
                        {btn.text}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Variables */}
              {selectedTemplate.variable_count > 0 && (
                <div>
                  <label className="text-sm font-semibold block mb-2">Variables</label>
                  <div className="space-y-2">
                    {JSON.parse(selectedTemplate.variable_labels || '[]').map((label, i) => (
                      <div key={i} className="text-sm">
                        <span className="font-mono bg-gray-100 px-2 py-1 rounded">{`{{${i + 1}}}`}</span>
                        <span className="ml-2 text-muted-foreground">→ {label}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Rejection Reason */}
              {selectedTemplate.status === 'REJECTED' && selectedTemplate.rejection_reason && (
                <div className="bg-red-50 border border-red-200 p-4 rounded">
                  <p className="text-sm font-semibold text-red-700 mb-1">Rejection Reason</p>
                  <p className="text-sm text-red-600">{selectedTemplate.rejection_reason}</p>
                </div>
              )}

              {/* Last Synced */}
              <p className="text-xs text-muted-foreground">
                Synced {selectedTemplate.last_synced_at ? Math.floor((Date.now() - new Date(selectedTemplate.last_synced_at)) / 60000) + ' minutes ago' : 'never'}
              </p>

              {/* Actions */}
              <div className="flex gap-2 justify-end border-t pt-4">
                <Button
                  variant="outline"
                  onClick={() => handleRefreshStatus(selectedTemplate)}
                  className="gap-2"
                >
                  <RefreshCw className="w-4 h-4" />
                  Refresh Status
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => {
                    handleDelete(selectedTemplate);
                  }}
                  className="gap-2"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Create Template Modal */}
      <CreateTemplateModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        currentUser={currentUser}
        onSuccess={fetchTemplates}
      />
    </div>
  );
}