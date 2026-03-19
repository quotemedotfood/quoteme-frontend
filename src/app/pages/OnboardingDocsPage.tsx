import { useState, useEffect, useRef } from 'react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { FileText, Link as LinkIcon, Plus, Trash2, Upload, Loader2, ExternalLink, ToggleLeft, ToggleRight } from 'lucide-react';
import { getOnboardingDocs, createOnboardingDoc, updateOnboardingDoc, deleteOnboardingDoc } from '../services/api';
import type { OnboardingDoc } from '../services/api';

export function OnboardingDocsPage() {
  const [docs, setDocs] = useState<OnboardingDoc[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState<'pdf' | 'link' | null>(null);
  const [saving, setSaving] = useState(false);
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const fetchDocs = async () => {
    const res = await getOnboardingDocs();
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setDocs(res.data);
    }
    setLoading(false);
  };

  useEffect(() => { fetchDocs(); }, []);

  const handleAdd = async () => {
    if (!title.trim()) return;
    setSaving(true);
    setError(null);

    const formData = new FormData();
    formData.append('title', title.trim());
    formData.append('doc_type', showAddForm!);
    if (showAddForm === 'link') {
      formData.append('url', url.trim());
    }
    if (file) {
      formData.append('file', file);
    }

    const res = await createOnboardingDoc(formData);
    if (res.error) {
      setError(res.error);
    } else if (res.data) {
      setDocs(prev => [...prev, res.data!]);
      resetForm();
    }
    setSaving(false);
  };

  const handleToggle = async (doc: OnboardingDoc) => {
    const formData = new FormData();
    formData.append('is_active', String(!doc.is_active));
    const res = await updateOnboardingDoc(doc.id, formData);
    if (res.data) {
      setDocs(prev => prev.map(d => d.id === doc.id ? res.data! : d));
    }
  };

  const handleDelete = async (id: string) => {
    const res = await deleteOnboardingDoc(id);
    if (!res.error) {
      setDocs(prev => prev.filter(d => d.id !== id));
    }
  };

  const resetForm = () => {
    setShowAddForm(null);
    setTitle('');
    setUrl('');
    setFile(null);
  };

  const pdfDocs = docs.filter(d => d.doc_type === 'pdf');
  const linkDocs = docs.filter(d => d.doc_type === 'link');

  return (
    <div className="p-4 md:p-8 bg-[#FFF9F3] min-h-screen">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <h1 className="text-2xl text-[#4F4F4F] mb-1">Onboarding Documents</h1>
          <p className="text-sm text-gray-500">
            Manage documents and links that get attached to your quotes
          </p>
        </div>

        {error && (
          <div className="bg-red-50 text-red-700 text-sm rounded-lg p-3 mb-4">
            {error}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-16">
            <Loader2 className="w-8 h-8 text-[#F2993D] animate-spin" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* PDF Documents */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg text-[#2A2A2A] flex items-center gap-2">
                  <FileText className="w-5 h-5 text-gray-500" />
                  Onboarding Documents
                </h2>
                <Button
                  size="sm"
                  className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
                  onClick={() => setShowAddForm('pdf')}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Document
                </Button>
              </div>

              {pdfDocs.length === 0 && !showAddForm && (
                <p className="text-sm text-gray-400 text-center py-6">No documents uploaded yet</p>
              )}

              <div className="space-y-3">
                {pdfDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <FileText className="w-5 h-5 text-[#F2993D] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#2A2A2A] truncate">{doc.title}</p>
                        {doc.file_name && (
                          <p className="text-xs text-gray-400 truncate">{doc.file_name}</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      {doc.file_url && (
                        <a href={doc.file_url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#7FAEC2] hover:underline">
                          Download
                        </a>
                      )}
                      <button onClick={() => handleToggle(doc)} className="text-gray-400 hover:text-gray-600" title={doc.is_active ? 'Disable' : 'Enable'}>
                        {doc.is_active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6" />}
                      </button>
                      <button onClick={() => handleDelete(doc.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {showAddForm === 'pdf' && (
                <div className="mt-4 border border-[#A5CFDD] rounded-lg p-4 bg-[#A5CFDD]/5">
                  <h3 className="text-sm font-medium text-[#2A2A2A] mb-3">Add Document</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm mb-1.5 block">Document Name</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. New Customer Application"
                        className="border-gray-300"
                      />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">PDF File</Label>
                      <div
                        className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-[#A5CFDD]"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        <input
                          ref={fileInputRef}
                          type="file"
                          accept=".pdf"
                          className="hidden"
                          onChange={(e) => setFile(e.target.files?.[0] || null)}
                        />
                        {file ? (
                          <p className="text-sm text-[#2A2A2A]">{file.name}</p>
                        ) : (
                          <div>
                            <Upload className="w-6 h-6 text-gray-400 mx-auto mb-1" />
                            <p className="text-xs text-gray-400">Click to upload PDF</p>
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
                      <Button
                        size="sm"
                        className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
                        onClick={handleAdd}
                        disabled={saving || !title.trim() || !file}
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Upload
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Onboarding Links */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg text-[#2A2A2A] flex items-center gap-2">
                  <LinkIcon className="w-5 h-5 text-gray-500" />
                  Onboarding Links
                </h2>
                <Button
                  size="sm"
                  className="bg-[#7FAEC2] hover:bg-[#6A9AB0] text-white"
                  onClick={() => setShowAddForm('link')}
                >
                  <Plus className="w-4 h-4 mr-1" /> Add Link
                </Button>
              </div>

              {linkDocs.length === 0 && showAddForm !== 'link' && (
                <p className="text-sm text-gray-400 text-center py-6">No links added yet</p>
              )}

              <div className="space-y-3">
                {linkDocs.map(doc => (
                  <div key={doc.id} className="flex items-center justify-between border border-gray-100 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <ExternalLink className="w-5 h-5 text-[#7FAEC2] flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[#2A2A2A] truncate">{doc.title}</p>
                        {doc.url && (
                          <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-xs text-[#7FAEC2] hover:underline truncate block">
                            {doc.url}
                          </a>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <button onClick={() => handleToggle(doc)} className="text-gray-400 hover:text-gray-600" title={doc.is_active ? 'Disable' : 'Enable'}>
                        {doc.is_active ? <ToggleRight className="w-6 h-6 text-green-500" /> : <ToggleLeft className="w-6 h-6" />}
                      </button>
                      <button onClick={() => handleDelete(doc.id)} className="text-gray-400 hover:text-red-500">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {showAddForm === 'link' && (
                <div className="mt-4 border border-[#A5CFDD] rounded-lg p-4 bg-[#A5CFDD]/5">
                  <h3 className="text-sm font-medium text-[#2A2A2A] mb-3">Add Link</h3>
                  <div className="space-y-3">
                    <div>
                      <Label className="text-sm mb-1.5 block">Link Name</Label>
                      <Input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="e.g. Online Credit Application"
                        className="border-gray-300"
                      />
                    </div>
                    <div>
                      <Label className="text-sm mb-1.5 block">URL</Label>
                      <Input
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="https://..."
                        className="border-gray-300"
                      />
                    </div>
                    <div className="flex gap-2 justify-end">
                      <Button variant="outline" size="sm" onClick={resetForm}>Cancel</Button>
                      <Button
                        size="sm"
                        className="bg-[#F2993D] hover:bg-[#E08A2E] text-white"
                        onClick={handleAdd}
                        disabled={saving || !title.trim() || !url.trim()}
                      >
                        {saving ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                        Save
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Info */}
            <div className="bg-[#A5CFDD]/10 rounded-lg p-4 border border-[#A5CFDD]/20 text-sm text-[#2A5F6F]">
              <p>
                Active documents will be appended to quote PDFs when sent. Active links will be listed under "Click Here To Start Your Account Setup" at the bottom of the quote.
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
