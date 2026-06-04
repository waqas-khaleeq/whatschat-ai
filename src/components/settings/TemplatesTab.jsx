import { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { RefreshCw, Plus, Trash2, Eye, CheckCircle, Clock, AlertCircle, Pause, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function TemplatesTab({ currentUser }) {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [syncing, setsyncing] = useState(false);
  const [lastSynced, setLastSynced] = useState(null);
  const [filter, setFilter] = useState('all');
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [stats, setStats] = useState({ approved: 0, pending: 0, rejected: 0, paused: 0 });

  useEffect(() => {
    fetchTemplates();
    checkLastSync();
  }, []);

  const checkLastSync = async () => {
    const settings = await base44.asServiceRole.entities.AppSettings.filter({
      key: `template_last_synced_${currentUser.id}`
    });
    if (settings.length > 0) {
      setLastSynced(new Date(settings[0].value));
    }
  };

  const fetchTemplates = async () => {
    setLoading(true);
    const temps = await base44.entities.MessageTemplate.filter({ owner_user_id: currentUser.id });
    setTemplates(temps);
    updateStats(temps);
    setLoading(false);
  };

  const updateStats = (temps) => {
    setStats({
      approved: temps.filter(t => t.status === 'APPROVED').length,
      pending: temps.filter(t => t.status === 'PENDING').length,
      rejected: temps.filter(t => t.status === 'REJECTED').length,
      paused: temps.filter(t => t.status === 'PAUSED').length
    });
  };

  const handleSync = async () => {
    setsyncing(true);
    const res = await base44.functions.invoke('syncWhatsAppTemplates', { user_id: currentUser.id });
    if (res.data.success) {
      await fetchTemplates();
      setLastSynced(new Date());
      await base44.asServiceRole.entities.AppSettings.create({
        key: `template_last_synced_${currentUser.id}`,
        value: new Date().toISOString(),
        category: 'templates'
      });
    }
    setsyncing(false);
  };

  const handleDelete = async (template) => {
    if (!confirm(`Delete template "${template.display_name}"?`)) return;
    await base44.functions.invoke('deleteWhatsAppTemplate', {
      user_id: currentUser.id,
      template_name: template.template_name
    });
    fetchTemplates();
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'APPROVED': return 'bg-green-100 text-green-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'REJECTED': return 'bg-red-100 text-red-800';
      case 'PAUSED': return 'bg-orange-100 text-orange-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'APPROVED': return <CheckCircle className="w-4 h-4" />;
      case 'PENDING': return <Clock className="w-4 h-4" />;
      case 'REJECTED': return <AlertCircle className="w-4 h-4" />;
      case 'PAUSED': return <Pause className="w-4 h-4" />;
      default: return null;
    }
  };

  const filteredTemplates = filter === 'all'
    ? templates
    : templates.filter(t => t.status === filter.toUpperCase());

  return (
    <div className="space-y-6">
      {/* How Templates Work */}
      <details className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <summary className="cursor-pointer font-semibold text-blue-900 flex items-center gap-2">
          <span>How Templates Work</span>
        </summary>
        <div className="mt-3 text-sm text-blue-800 space-y-2">
          <p>WhatsApp has a strict rule:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>If a customer messages YOU first: you can reply freely for 24 hours</li>
            <li>If you want to message someone who has NOT messaged you: you MUST use an approved template</li>
          </ul>
          <p className="mt-2 font-semibold">Process:</p>
          <ol className="list-decimal ml-5 space-y-1">
            <li>Create your template here (30 seconds with AI assist)</li>
            <li>Submit it to Meta — they review automatically</li>
            <li>Utility templates: usually approved in minutes</li>
            <li>Marketing templates: can take a few hours</li>
            <li>Once APPROVED: use it for new contacts</li>
          </ol>
          <p className="mt-2 font-semibold">Tips:</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Use UTILITY for transactional messages (follow-ups, reminders, confirmations)</li>
            <li>Avoid URLs in first templates</li>
            <li>Keep messages professional and relevant</li>
          </ul>
        </div>
      </details>

      {/* Header & Actions */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Message Templates</h3>
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
          <Button className="gap-2">
            <Plus className="w-4 h-4" />
            Create Template
          </Button>
        </div>
      </div>

      {/* Status Bar */}
      <div className="bg-gray-50 rounded-lg p-4 space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            Last synced: {lastSynced ? new Date(lastSynced).toLocaleString() : 'Never — sync to see your templates'}
          </span>
        </div>
        <div className="flex gap-2 flex-wrap">
          {stats.approved > 0 && (
            <div className="bg-green-100 text-green-800 px-3 py-1 rounded-full text-sm font-semibold">
              {stats.approved} Approved
            </div>
          )}
          {stats.pending > 0 && (
            <div className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-semibold">
              {stats.pending} Pending
            </div>
          )}
          {stats.rejected > 0 && (
            <div className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-sm font-semibold">
              {stats.rejected} Rejected
            </div>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex gap-2 border-b">
        {['all', 'approved', 'pending', 'rejected'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 font-medium border-b-2 ${
              filter === f ? 'border-primary text-primary' : 'border-transparent text-muted-foreground'
            }`}
          >
            {f.charAt(0).toUpperCase() + f.slice(1)}
          </button>
        ))}
      </div>

      {/* Templates Table */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-8 h-8 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="text-center py-12 bg-gray-50 rounded-lg">
          <p className="text-muted-foreground mb-4">No templates yet. Create your first template or sync from Meta to import existing ones.</p>
          <div className="flex gap-2 justify-center">
            <Button variant="outline">Create Template</Button>
            <Button variant="outline" onClick={handleSync}>Sync from Meta</Button>
          </div>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="text-left px-4 py-3 font-semibold text-sm">Name</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Category</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Status</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Variables</th>
                <th className="text-left px-4 py-3 font-semibold text-sm">Preview</th>
                <th className="text-right px-4 py-3 font-semibold text-sm">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {filteredTemplates.map(template => (
                <tr key={template.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <div>
                      <div className="font-semibold">{template.display_name}</div>
                      <div className="text-xs text-muted-foreground font-mono">{template.template_name}</div>
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-1 bg-blue-100 text-blue-800 rounded">{template.category}</span>
                  </td>
                  <td className="px-4 py-3">
                    <div className={`flex items-center gap-1 w-fit px-2 py-1 rounded text-xs font-semibold ${getStatusColor(template.status)}`}>
                      {getStatusIcon(template.status)}
                      {template.status}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {template.variable_count > 0 ? `${template.variable_count} variables` : 'No variables'}
                  </td>
                  <td className="px-4 py-3 text-sm text-muted-foreground truncate max-w-xs">
                    {template.body_text.substring(0, 50)}...
                  </td>
                  <td className="px-4 py-3 text-right space-x-1">
                    <button
                      onClick={() => setSelectedTemplate(template)}
                      className="p-1 hover:bg-gray-100 rounded inline-flex"
                      title="View"
                    >
                      <Eye className="w-4 h-4 text-gray-600" />
                    </button>
                    <button
                      onClick={() => handleDelete(template)}
                      className="p-1 hover:bg-red-100 rounded inline-flex"
                      title="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-red-600" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Detail Modal */}
      {selectedTemplate && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-2xl font-bold">{selectedTemplate.display_name}</h2>
                <div className="flex gap-2 mt-2">
                  <span className={`px-2 py-1 rounded text-xs font-semibold ${getStatusColor(selectedTemplate.status)}`}>
                    {selectedTemplate.status}
                  </span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold">
                    {selectedTemplate.category}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelectedTemplate(null)} className="p-1 hover:bg-gray-100 rounded">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4 text-sm">
              <div>
                <label className="font-semibold text-muted-foreground">Template Name</label>
                <code className="block bg-gray-100 p-2 rounded mt-1 break-all">{selectedTemplate.template_name}</code>
              </div>

              {selectedTemplate.header_text && (
                <div>
                  <label className="font-semibold text-muted-foreground">Header</label>
                  <div className="bg-green-50 p-3 rounded mt-1">{selectedTemplate.header_text}</div>
                </div>
              )}

              <div>
                <label className="font-semibold text-muted-foreground">Body</label>
                <div className="bg-white border border-gray-300 p-3 rounded mt-1 whitespace-pre-wrap break-words">
                  {selectedTemplate.body_text.split(/(\{\{\d+\}\})/g).map((part, i) =>
                    /\{\{\d+\}\}/.test(part) ? (
                      <span key={i} className="bg-green-200 px-1 rounded font-semibold">{part}</span>
                    ) : (
                      <span key={i}>{part}</span>
                    )
                  )}
                </div>
              </div>

              {selectedTemplate.footer_text && (
                <div>
                  <label className="font-semibold text-muted-foreground">Footer</label>
                  <div className="text-muted-foreground p-2 rounded mt-1">{selectedTemplate.footer_text}</div>
                </div>
              )}

              {selectedTemplate.variable_count > 0 && (
                <div>
                  <label className="font-semibold text-muted-foreground">Variables</label>
                  <ol className="list-decimal ml-5 mt-1">
                    {selectedTemplate.variable_labels ? (
                      JSON.parse(selectedTemplate.variable_labels).map((label, i) => (
                        <li key={i}>{`{{${i + 1}}} = ${label}`}</li>
                      ))
                    ) : (
                      Array.from({ length: selectedTemplate.variable_count }).map((_, i) => (
                        <li key={i}>{`{{${i + 1}}}`}</li>
                      ))
                    )}
                  </ol>
                </div>
              )}

              {selectedTemplate.status === 'REJECTED' && selectedTemplate.rejection_reason && (
                <div className="bg-red-50 border border-red-200 p-3 rounded">
                  <label className="font-semibold text-red-800">Rejection Reason</label>
                  <p className="text-red-700 mt-1">{selectedTemplate.rejection_reason}</p>
                </div>
              )}
            </div>

            <div className="mt-6 flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setSelectedTemplate(null)}>Close</Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}