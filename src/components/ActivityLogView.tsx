import React, { useState } from 'react';
import { AuditLogEntry } from '../types';
import { ClipboardList, Shield, Search, Download, Trash2 } from 'lucide-react';
import { GeminiSparkle } from './GeminiSparkle';

interface ActivityLogViewProps {
  logs: AuditLogEntry[];
  onClearLogs: () => void;
}

export const ActivityLogView: React.FC<ActivityLogViewProps> = ({ logs, onClearLogs }) => {
  const [filter, setFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredLogs = logs.filter((log) => {
    if (filter !== 'all' && log.eventType !== filter && log.channel !== filter) {
      return false;
    }
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      return (
        log.details.toLowerCase().includes(q) ||
        log.senderOrRecipient.toLowerCase().includes(q) ||
        log.actionTaken.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const exportLogsAsJson = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(logs, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `messaging_assistant_audit_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="max-w-6xl mx-auto space-y-4">
      {/* Top Header Card */}
      <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-5 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <GeminiSparkle size={18} />
            <h2 className="text-base sm:text-lg font-bold text-[#e3e3e3]">
              Activity & Audit Trail
            </h2>
          </div>
          <p className="text-xs sm:text-sm text-[#8e918f]">
            Non-sensitive event log tracking pipeline ingress, safety classifications, manual review actions, and simulated dispatches.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={exportLogsAsJson}
            className="px-3.5 py-1.5 bg-[#282a2c] hover:bg-[#333538] text-[#c4c7c5] text-xs font-semibold rounded-full border border-[#37393b] transition-colors flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export JSON</span>
          </button>
          <button
            onClick={onClearLogs}
            className="px-3.5 py-1.5 bg-[#ea4335]/20 hover:bg-[#ea4335]/30 text-[#f28b82] text-xs font-semibold rounded-full border border-[#ea4335]/30 transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear Log</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#1e1f20] rounded-xl border border-[#2d2f31] p-3 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-1 p-0.5 bg-[#131314] rounded-full border border-[#282a2c]">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              filter === 'all' ? 'bg-[#282a2c] text-[#e3e3e3]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
            }`}
          >
            All Events ({logs.length})
          </button>
          <button
            onClick={() => setFilter('MESSAGE_INGRESS')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              filter === 'MESSAGE_INGRESS' ? 'bg-[#282a2c] text-[#e3e3e3]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
            }`}
          >
            Ingress
          </button>
          <button
            onClick={() => setFilter('sms')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              filter === 'sms' ? 'bg-[#282a2c] text-[#70a6ff]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
            }`}
          >
            SMS
          </button>
          <button
            onClick={() => setFilter('whatsapp')}
            className={`px-3 py-1 rounded-full font-medium transition-colors ${
              filter === 'whatsapp' ? 'bg-[#282a2c] text-[#25d366]' : 'text-[#8e918f] hover:text-[#e3e3e3]'
            }`}
          >
            WhatsApp
          </button>
        </div>

        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-[#8e918f] absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search audit trail..."
            className="w-full pl-8 pr-3 py-1.5 bg-[#131314] border border-[#282a2c] rounded-full text-xs text-[#e3e3e3] focus:outline-none focus:ring-1 focus:ring-[#a8c7fa]"
          />
        </div>
      </div>

      {/* Table */}
      <div className="bg-[#1e1f20] rounded-xl border border-[#2d2f31] overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#18191a] border-b border-[#2d2f31] text-[#8e918f] font-medium">
              <tr>
                <th className="py-2.5 px-3.5 font-mono">Timestamp</th>
                <th className="py-2.5 px-3">Channel</th>
                <th className="py-2.5 px-3">Event Type</th>
                <th className="py-2.5 px-3">Sender / Recipient</th>
                <th className="py-2.5 px-3">Action Decision</th>
                <th className="py-2.5 px-3.5">Audit Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#282a2c]">
              {filteredLogs.map((log) => {
                const isAuto = log.decision === 'AUTO_SEND_ELIGIBLE';
                const isBlocked = log.decision === 'BLOCKED_BY_SAFETY';

                return (
                  <tr key={log.id} className="hover:bg-[#282a2c]/50 transition-colors">
                    <td className="py-2.5 px-3.5 font-mono text-[#8e918f] whitespace-nowrap">
                      {log.timestamp}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`font-semibold ${log.channel === 'sms' ? 'text-[#70a6ff]' : log.channel === 'whatsapp' ? 'text-[#25d366]' : 'text-[#8e918f]'}`}>
                        {log.channel.toUpperCase()}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-mono text-[#c4c7c5] whitespace-nowrap">
                      {log.eventType}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#e3e3e3] whitespace-nowrap">
                      {log.senderOrRecipient}
                    </td>
                    <td className="py-2.5 px-3 whitespace-nowrap">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold ${
                        isAuto ? 'bg-[#34a853]/20 text-[#81c995]' : isBlocked ? 'bg-[#ea4335]/20 text-[#f28b82]' : 'bg-[#fbbc04]/20 text-[#fdd663]'
                      }`}>
                        {log.decision}
                      </span>
                    </td>
                    <td className="py-2.5 px-3.5 text-[#8e918f]">
                      <span className="line-clamp-2">{log.details}</span>
                    </td>
                  </tr>
                );
              })}
              {filteredLogs.length === 0 && (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-[#8e918f]">
                    No matching activity logs found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
