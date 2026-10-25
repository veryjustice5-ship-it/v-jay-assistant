import React, { useState } from 'react';
import { 
  Contact, 
  SystemSettings, 
  MessageCategory, 
  AutomationMode, 
  CommunicationStyle 
} from '../types';
import { 
  Shield, 
  Sliders, 
  Users, 
  Clock, 
  Trash2, 
  Check, 
  AlertCircle,
  Plus,
  Save
} from 'lucide-react';
import { GeminiSparkle } from './GeminiSparkle';

interface SettingsViewProps {
  settings: SystemSettings;
  contacts: Contact[];
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  onUpdateContactPermission: (contactId: string, isPermitted: boolean) => void;
  onAddContact: (contact: Omit<Contact, 'id'>) => void;
  onClearAllData: () => void;
}

const ALL_CATEGORIES: { id: MessageCategory; label: string; desc: string; defaultSafe: boolean }[] = [
  { id: 'greetings', label: 'Greetings & Salutations', desc: 'Social hellos, good mornings, pleasantries', defaultSafe: true },
  { id: 'casual_conversation', label: 'Casual Conversation', desc: 'Everyday friendly non-committal banter', defaultSafe: true },
  { id: 'requests_for_information', label: 'Requests for Information', desc: 'Requests for links, addresses, shared docs', defaultSafe: true },
  { id: 'questions', label: 'General Questions', desc: 'Informational questions requiring facts', defaultSafe: false },
  { id: 'school_related', label: 'School & Coursework', desc: 'Homework, exams, professors, syllabus updates', defaultSafe: false },
  { id: 'work_related', label: 'Work & Professional', desc: 'Projects, deadlines, client updates, milestones', defaultSafe: false },
  { id: 'business_inquiries', label: 'Business Inquiries', desc: 'Commercial quotes, vendor queries, contracts', defaultSafe: false },
  { id: 'scheduling', label: 'Scheduling & Calendar', desc: 'Meeting requests, times, calendar commitments (Refuses to hallucinate)', defaultSafe: false },
  { id: 'sensitive_personal', label: 'Sensitive / Security', desc: 'Verification codes, OTP, financial data (ALWAYS ESCALATED)', defaultSafe: false },
  { id: 'suspicious_messages', label: 'Suspicious / Injections', desc: 'Prompt injections, overrides (ALWAYS BLOCKED)', defaultSafe: false },
];

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  contacts,
  onUpdateSettings,
  onUpdateContactPermission,
  onAddContact,
  onClearAllData,
}) => {
  const [newContactName, setNewContactName] = useState('');
  const [newContactPhone, setNewContactPhone] = useState('');
  const [newContactChannel, setNewContactChannel] = useState<'sms' | 'whatsapp'>('sms');
  const [newContactPermitted, setNewContactPermitted] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [saveToast, setSaveToast] = useState(false);

  const handleToggleCategory = (category: MessageCategory) => {
    if (category === 'sensitive_personal' || category === 'suspicious_messages') {
      return;
    }
    const current = new Set(settings.allowedCategories);
    if (current.has(category)) {
      current.delete(category);
    } else {
      current.add(category);
    }
    onUpdateSettings({ allowedCategories: Array.from(current) });
    triggerSaveToast();
  };

  const triggerSaveToast = () => {
    setSaveToast(true);
    setTimeout(() => setSaveToast(false), 2000);
  };

  const handleCreateContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newContactName.trim() || !newContactPhone.trim()) return;

    onAddContact({
      name: newContactName.trim(),
      phone: newContactPhone.trim(),
      channel: newContactChannel,
      avatarColor: newContactChannel === 'sms' ? 'bg-[#70a6ff]' : 'bg-[#25d366]',
      isPermittedForAuto: newContactPermitted,
      relationship: newContactPermitted ? 'Permitted Contact' : 'Standard Contact',
      lastActive: 'Added recently',
    });

    setNewContactName('');
    setNewContactPhone('');
    setShowAddModal(false);
    triggerSaveToast();
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-6 right-6 z-50 bg-[#282a2c] text-[#e3e3e3] border border-[#37393b] text-xs px-4 py-2.5 rounded-full shadow-lg flex items-center gap-2">
          <Check className="w-4 h-4 text-[#81c995]" />
          <span>Rules updated and enforced on the server.</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GeminiSparkle size={18} />
            <h2 className="text-base sm:text-lg font-bold text-[#e3e3e3]">
              Safeguards, Rules & Contact Allowlist
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#8e918f]">
            Configure contact authorization, category allowlists, rate limits, and data retention rules.
          </p>
        </div>

        <span className="text-xs font-mono text-[#8e918f] px-3 py-1 bg-[#131314] rounded-full border border-[#282a2c]">
          Server-Side Protected
        </span>
      </div>

      {/* Section 1: Permitted Contacts Allowlist */}
      <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-[#a8c7fa]" />
            <h3 className="text-sm font-bold text-[#e3e3e3]">
              Permitted Contacts Allowlist (Mode C)
            </h3>
          </div>

          <button
            onClick={() => setShowAddModal(!showAddModal)}
            className="px-3 py-1.5 bg-[#282a2c] hover:bg-[#333538] text-[#e3e3e3] border border-[#37393b] rounded-full text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            <Plus className="w-3.5 h-3.5 text-[#a8c7fa]" />
            <span>Add Contact</span>
          </button>
        </div>

        <p className="text-xs text-[#8e918f] leading-relaxed">
          In Mode C (Restricted Automatic Replies), the assistant will <strong>only</strong> reply automatically to contacts explicitly toggled below.
          Unknown senders and unpermitted contacts are always escalated for review.
        </p>

        {/* Add Contact Modal Form */}
        {showAddModal && (
          <form onSubmit={handleCreateContact} className="p-4 bg-[#131314] rounded-xl border border-[#37393b] space-y-3 text-xs">
            <h4 className="font-bold text-[#e3e3e3]">Add New Contact Rule</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[#8e918f] mb-1">Contact Name:</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Alex Smith"
                  value={newContactName}
                  onChange={(e) => setNewContactName(e.target.value)}
                  className="w-full p-2 bg-[#1e1f20] text-[#e3e3e3] border border-[#37393b] rounded-lg"
                />
              </div>
              <div>
                <label className="block text-[#8e918f] mb-1">Phone Number:</label>
                <input
                  type="text"
                  required
                  placeholder="+1 (555) 000-0000"
                  value={newContactPhone}
                  onChange={(e) => setNewContactPhone(e.target.value)}
                  className="w-full p-2 bg-[#1e1f20] text-[#e3e3e3] border border-[#37393b] rounded-lg"
                />
              </div>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <div className="flex items-center gap-4 text-[#c4c7c5]">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="newChannel"
                    value="sms"
                    checked={newContactChannel === 'sms'}
                    onChange={() => setNewContactChannel('sms')}
                  />
                  <span>SMS</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="newChannel"
                    value="whatsapp"
                    checked={newContactChannel === 'whatsapp'}
                    onChange={() => setNewContactChannel('whatsapp')}
                  />
                  <span>WhatsApp</span>
                </label>
                <label className="flex items-center gap-1.5 font-medium text-[#81c995] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newContactPermitted}
                    onChange={(e) => setNewContactPermitted(e.target.checked)}
                  />
                  <span>Authorize Auto-Replies (Mode C)</span>
                </label>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-3 py-1 border border-[#37393b] rounded-full text-[#8e918f] hover:text-[#e3e3e3]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 bg-[#a8c7fa] text-[#041e49] rounded-full font-bold hover:bg-[#8ab4f8]"
                >
                  Save Contact
                </button>
              </div>
            </div>
          </form>
        )}

        {/* Contacts Table */}
        <div className="border border-[#282a2c] rounded-xl overflow-hidden divide-y divide-[#282a2c] text-xs">
          {contacts.map((c) => (
            <div key={c.id} className="p-3.5 flex items-center justify-between bg-[#131314] hover:bg-[#18191a] transition-colors">
              <div className="flex items-center gap-3">
                <div className={`w-8 h-8 rounded-full ${c.avatarColor} text-white flex items-center justify-center font-bold text-xs`}>
                  {c.name.charAt(0)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-[#e3e3e3]">{c.name}</span>
                    <span className={c.channel === 'sms' ? 'text-[#70a6ff] font-medium' : 'text-[#25d366] font-medium'}>
                      [{c.channel.toUpperCase()}]
                    </span>
                    {c.isTestContact && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#a8c7fa]/20 text-[#a8c7fa] border border-[#a8c7fa]/40">
                        SAFE TEST RIG
                      </span>
                    )}
                  </div>
                  <span className="text-[#8e918f] font-mono">{c.phone}</span>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-[#8e918f] hidden sm:inline">
                  {c.isPermittedForAuto ? 'Authorized for Auto' : 'Approval Required'}
                </span>
                <button
                  onClick={() => {
                    onUpdateContactPermission(c.id, !c.isPermittedForAuto);
                    triggerSaveToast();
                  }}
                  className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors ${
                    c.isPermittedForAuto
                      ? 'bg-[#34a853]/20 text-[#81c995] border border-[#34a853]/40'
                      : 'bg-[#282a2c] text-[#8e918f] border border-[#37393b] hover:text-[#e3e3e3]'
                  }`}
                >
                  {c.isPermittedForAuto ? 'Authorized' : 'Restrict'}
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Section 2: Allowed Message Categories for Auto-Reply */}
      <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <Shield className="w-5 h-5 text-[#a8c7fa]" />
          <h3 className="text-sm font-bold text-[#e3e3e3]">
            Allowed Categories for Auto-Reply
          </h3>
        </div>

        <p className="text-xs text-[#8e918f] leading-relaxed">
          Select which classifications are eligible for automated responses in Mode C.
          Any category unchecked generates drafts for review. Sensitive topics and prompt injection threats can never be auto-replied.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 text-xs">
          {ALL_CATEGORIES.map((cat) => {
            const isChecked = settings.allowedCategories.includes(cat.id);
            const isLocked = cat.id === 'sensitive_personal' || cat.id === 'suspicious_messages';

            return (
              <label
                key={cat.id}
                className={`p-3 rounded-xl border flex items-start gap-3 transition-colors ${
                  isLocked
                    ? 'bg-[#18191a] border-[#282a2c] text-[#5f6266] cursor-not-allowed'
                    : isChecked
                    ? 'bg-[#18191a] border-[#34a853]/40 text-[#e3e3e3] cursor-pointer'
                    : 'bg-[#131314] border-[#282a2c] text-[#8e918f] hover:border-[#37393b] cursor-pointer'
                }`}
              >
                <input
                  type="checkbox"
                  disabled={isLocked}
                  checked={isChecked}
                  onChange={() => handleToggleCategory(cat.id)}
                  className="mt-0.5 rounded text-[#a8c7fa] focus:ring-0 bg-[#282a2c] border-[#37393b]"
                />
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-xs text-[#e3e3e3]">{cat.label}</span>
                    {isLocked && (
                      <span className="text-[10px] font-mono text-[#f28b82] font-bold">
                        LOCKED
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-[#8e918f] leading-tight">{cat.desc}</p>
                </div>
              </label>
            );
          })}
        </div>
      </div>

      {/* Section 3: Safety Limits & Data Purge */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Rate Limits */}
        <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-5 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-[#a8c7fa]" />
            <h4 className="font-bold text-[#e3e3e3]">Anti-Spam Rate Limits</h4>
          </div>

          <div className="space-y-2">
            <label className="block text-[#8e918f]">Global Max Auto-Replies / Hour:</label>
            <input
              type="number"
              min={1}
              max={50}
              value={settings.maxGlobalPerHour}
              onChange={(e) => {
                onUpdateSettings({ maxGlobalPerHour: parseInt(e.target.value) || 10 });
                triggerSaveToast();
              }}
              className="w-24 p-2 bg-[#131314] border border-[#37393b] rounded-lg text-xs text-[#e3e3e3]"
            />
          </div>

          <div className="space-y-2">
            <label className="block text-[#8e918f]">Max Per Single Contact / Hour:</label>
            <input
              type="number"
              min={1}
              max={10}
              value={settings.maxPerContactPerHour}
              onChange={(e) => {
                onUpdateSettings({ maxPerContactPerHour: parseInt(e.target.value) || 3 });
                triggerSaveToast();
              }}
              className="w-24 p-2 bg-[#131314] border border-[#37393b] rounded-lg text-xs text-[#e3e3e3]"
            />
          </div>
        </div>

        {/* Data Purge */}
        <div className="bg-[#1e1f20] rounded-2xl border border-[#ea4335]/30 p-5 shadow-xs space-y-3 text-xs">
          <div className="flex items-center gap-2 text-[#f28b82]">
            <Trash2 className="w-4 h-4" />
            <h4 className="font-bold">Data Retention & Conversation Purge</h4>
          </div>
          <p className="text-[#8e918f] leading-relaxed">
            Maintain useful context without unnecessarily storing private conversations. Cleanly wipe stored message history at any time.
          </p>
          <button
            onClick={() => {
              if (confirm('Are you sure you want to delete all stored conversation history?')) {
                onClearAllData();
                triggerSaveToast();
              }
            }}
            className="px-4 py-2 bg-[#ea4335]/20 hover:bg-[#ea4335]/30 text-[#f28b82] border border-[#ea4335]/40 rounded-full font-semibold transition-colors"
          >
            Purge All Stored Conversations
          </button>
        </div>
      </div>
    </div>
  );
};
