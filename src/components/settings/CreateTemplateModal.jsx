import { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { X, Wand2, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function CreateTemplateModal({ isOpen, onClose, currentUser, onSuccess }) {
  const [mode, setMode] = useState('choose'); // choose | ai | manual | review
  const [aiPrompt, setAiPrompt] = useState('');
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState('');
  
  const [displayName, setDisplayName] = useState('');
  const [templateName, setTemplateName] = useState('');
  const [category, setCategory] = useState('UTILITY');
  const [headerText, setHeaderText] = useState('');
  const [bodyText, setBodyText] = useState('');
  const [footerText, setFooterText] = useState('');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState('');

  const generateTemplateName = (name) => {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9\s_]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 512);
  };

  const handleAiGenerate = async () => {
    if (!aiPrompt.trim()) {
      setAiError('Please describe the template you want');
      return;
    }
    setAiLoading(true);
    setAiError('');
    try {
      const res = await base44.functions.invoke('generateTemplateWithAI', {
        user_id: currentUser.id,
        description: aiPrompt
      });
      if (res.data.success) {
        setDisplayName(res.data.template.display_name);
        setTemplateName(res.data.template.template_name);
        setCategory(res.data.template.category);
        setHeaderText(res.data.template.header_text || '');
        setBodyText(res.data.template.body_text);
        setFooterText(res.data.template.footer_text || '');
        setMode('review');
      } else {
        setAiError(res.data.error || 'Failed to generate template');
      }
    } catch (err) {
      setAiError(err.message);
    } finally {
      setAiLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    if (!displayName.trim()) {
      setError('Display name is required');
      return;
    }
    if (!bodyText.trim()) {
      setError('Body text is required');
      return;
    }
    setCreating(true);
    setError('');
    try {
      const res = await base44.functions.invoke('createWhatsAppTemplate', {
        user_id: currentUser.id,
        display_name: displayName,
        template_name: templateName || generateTemplateName(displayName),
        category,
        header_text: headerText || undefined,
        body_text: bodyText,
        footer_text: footerText || undefined
      });
      if (res.data.success) {
        onSuccess();
        resetForm();
        onClose();
      } else {
        setError(res.data.error || 'Failed to create template');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const resetForm = () => {
    setMode('choose');
    setAiPrompt('');
    setAiError('');
    setDisplayName('');
    setTemplateName('');
    setCategory('UTILITY');
    setHeaderText('');
    setBodyText('');
    setFooterText('');
    setError('');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-xl font-bold">Create Message Template</h2>
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6">
          {mode === 'choose' && (
            <div className="space-y-4">
              <p className="text-sm text-muted-foreground mb-6">How would you like to create your template?</p>
              <button
                onClick={() => setMode('ai')}
                className="w-full p-4 border-2 border-blue-200 rounded-lg hover:bg-blue-50 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Wand2 className="w-5 h-5 text-blue-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-blue-900">AI-Assisted (Recommended)</p>
                    <p className="text-sm text-blue-700 mt-0.5">Describe your template, AI creates it for you</p>
                  </div>
                </div>
              </button>
              <button
                onClick={() => setMode('manual')}
                className="w-full p-4 border-2 border-gray-200 rounded-lg hover:bg-gray-50 text-left transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Plus className="w-5 h-5 text-gray-600 shrink-0" />
                  <div>
                    <p className="font-semibold text-gray-900">Create Manually</p>
                    <p className="text-sm text-gray-600 mt-0.5">Write your template content directly</p>
                  </div>
                </div>
              </button>
            </div>
          )}

          {mode === 'ai' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-2">What should this template do?</label>
                <textarea
                  value={aiPrompt}
                  onChange={(e) => setAiPrompt(e.target.value)}
                  placeholder="e.g., 'Follow-up message for interested leads asking about appointment availability'"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  rows={4}
                />
              </div>
              {aiError && <p className="text-sm text-red-600">{aiError}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setMode('choose')}>Back</Button>
                <Button onClick={handleAiGenerate} disabled={aiLoading} className="gap-2">
                  <Wand2 className="w-4 h-4" />
                  {aiLoading ? 'Generating...' : 'Generate Template'}
                </Button>
              </div>
            </div>
          )}

          {mode === 'manual' && (
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-2">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  placeholder="e.g., First Contact"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">Category</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                >
                  <option value="UTILITY">Utility (Transactional, follow-ups)</option>
                  <option value="MARKETING">Marketing (Promotions)</option>
                  <option value="AUTHENTICATION">Authentication (Codes, confirmations)</option>
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">Header (Optional)</label>
                <input
                  type="text"
                  value={headerText}
                  onChange={(e) => setHeaderText(e.target.value)}
                  placeholder="e.g., Special Offer"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">Body *</label>
                <textarea
                  value={bodyText}
                  onChange={(e) => setBodyText(e.target.value)}
                  placeholder="Your message. Use {{1}}, {{2}} for variables"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                  rows={5}
                />
                <p className="text-xs text-muted-foreground mt-1">{'Use {{1}}, {{2}}, etc. to mark variable positions'}</p>
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">Footer (Optional)</label>
                <input
                  type="text"
                  value={footerText}
                  onChange={(e) => setFooterText(e.target.value)}
                  placeholder="e.g., Regards, Team"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-300 text-sm"
                />
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setMode('choose')}>Back</Button>
                <Button onClick={handleCreateTemplate} disabled={creating}>
                  {creating ? 'Creating...' : 'Create Template'}
                </Button>
              </div>
            </div>
          )}

          {mode === 'review' && (
            <div className="space-y-4">
              <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
                <p className="text-sm text-blue-800 mb-3">Review and adjust if needed:</p>
                <div className="space-y-3 text-sm">
                  <div>
                    <label className="font-semibold">Display Name</label>
                    <input
                      type="text"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg mt-1 text-sm"
                    />
                  </div>
                  <div>
                    <label className="font-semibold">Category</label>
                    <select
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg mt-1 text-sm"
                    >
                      <option value="UTILITY">Utility</option>
                      <option value="MARKETING">Marketing</option>
                      <option value="AUTHENTICATION">Authentication</option>
                    </select>
                  </div>
                  <div>
                    <label className="font-semibold">Body</label>
                    <textarea
                      value={bodyText}
                      onChange={(e) => setBodyText(e.target.value)}
                      className="w-full px-3 py-2 border border-blue-200 rounded-lg mt-1 text-sm"
                      rows={4}
                    />
                  </div>
                </div>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setMode('ai')}>Back</Button>
                <Button onClick={handleCreateTemplate} disabled={creating}>
                  {creating ? 'Creating...' : 'Submit to Meta'}
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}