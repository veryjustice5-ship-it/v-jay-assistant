import React, { useState } from 'react';
import { 
  SCENARIO_PRESETS, 
  ScenarioPreset 
} from '../data/mockData';
import { 
  Contact, 
  SystemSettings, 
  PipelineExecutionResult, 
  ChannelType 
} from '../types';
import { 
  Play, 
  CheckCircle2, 
  AlertTriangle, 
  ShieldAlert, 
  Sparkles, 
  ArrowRight, 
  Layers,
  Send,
  Zap,
  Check
} from 'lucide-react';
import { GeminiSparkle } from './GeminiSparkle';

interface ScenariosViewProps {
  contacts: Contact[];
  settings: SystemSettings;
  onUpdateSettings: (newSettings: Partial<SystemSettings>) => void;
  onExecutePipeline: (
    text: string, 
    contactId: string, 
    channel: ChannelType, 
    tempSettingsOverride?: Partial<SystemSettings>
  ) => PipelineExecutionResult;
  onApplyPipelineResultToConversation: (result: PipelineExecutionResult) => void;
}

export const ScenariosView: React.FC<ScenariosViewProps> = ({
  contacts,
  settings,
  onUpdateSettings,
  onExecutePipeline,
  onApplyPipelineResultToConversation,
}) => {
  const [selectedScenarioId, setSelectedScenarioId] = useState<number>(1);
  const [lastResult, setLastResult] = useState<PipelineExecutionResult | null>(null);

  // Custom Simulator Form State
  const [customText, setCustomText] = useState('Hey, how are you?');
  const [customChannel, setCustomChannel] = useState<ChannelType>('sms');
  const [customContactId, setCustomContactId] = useState(contacts[0]?.id || 'contact-sarah');

  const handleRunPresetScenario = (preset: ScenarioPreset) => {
    setSelectedScenarioId(preset.id);

    let override: Partial<SystemSettings> | undefined = undefined;
    if (preset.id === 3) {
      override = { automationMode: 'restricted_auto', automationEnabled: true, emergencyStop: false };
      onUpdateSettings(override);
    } else if (preset.id === 6) {
      override = { automationEnabled: false, emergencyStop: false };
      onUpdateSettings(override);
    } else if (preset.id === 7) {
      override = { emergencyStop: true };
      onUpdateSettings(override);
    }

    const result = onExecutePipeline(preset.messageText, preset.senderId, preset.channel, override);
    setLastResult(result);
    onApplyPipelineResultToConversation(result);
  };

  const handleRunCustom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customText.trim()) return;
    const result = onExecutePipeline(customText.trim(), customContactId, customChannel);
    setLastResult(result);
    onApplyPipelineResultToConversation(result);
  };

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Overview Banner (Gemini Style) */}
      <div className="bg-[#1e1f20] rounded-2xl border border-[#2d2f31] p-5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <GeminiSparkle size={20} />
              <h2 className="text-base sm:text-lg font-bold text-[#e3e3e3] tracking-tight">
                8-Stage Ingress Pipeline Demonstration
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#8e918f] max-w-3xl leading-relaxed">
              Execute each of the 7 official test scenarios. Inspect Gemini's server-side safety containment,
              anti-hallucination reply synthesis, and automation policy resolution in real time.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <span className="text-xs text-[#8e918f]">Active Mode:</span>
            <span className="px-3 py-1 bg-[#282a2c] text-[#a8c7fa] border border-[#37393b] rounded-full font-mono text-xs font-semibold uppercase">
              {settings.automationMode.replace('_', ' ')}
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: 7 Official Scenario Cards */}
        <div className="lg:col-span-5 space-y-3">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-[#8e918f] uppercase tracking-wider">
              Required Test Scenarios
            </h3>
            <span className="text-xs text-[#8e918f] font-mono">1-Click Run</span>
          </div>

          <div className="space-y-2">
            {SCENARIO_PRESETS.map((preset) => {
              const isSelected = selectedScenarioId === preset.id;
              return (
                <div
                  key={preset.id}
                  className={`p-3.5 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-[#2b2d30] border-[#a8c7fa]/50 shadow-md'
                      : 'bg-[#1e1f20] border-[#2d2f31] hover:border-[#37393b]'
                  }`}
                  onClick={() => handleRunPresetScenario(preset)}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="font-bold text-xs text-[#e3e3e3]">
                      {preset.title}
                    </span>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleRunPresetScenario(preset);
                      }}
                      className="px-2.5 py-1 bg-[#a8c7fa] text-[#041e49] rounded-full text-[11px] font-bold hover:bg-[#8ab4f8] flex items-center gap-1 shadow-xs"
                    >
                      <Play className="w-2.5 h-2.5 fill-current" />
                      <span>Run</span>
                    </button>
                  </div>

                  <div className="p-2 bg-[#131314] rounded-lg font-mono text-xs text-[#c4c7c5] mb-2 border border-[#282a2c]">
                    "{preset.messageText}"
                  </div>

                  <p className="text-xs text-[#8e918f] mb-2">
                    {preset.highlightNote}
                  </p>

                  <div className="flex items-center gap-2 text-[11px] text-[#8e918f] pt-1.5 border-t border-[#282a2c]">
                    <span className={preset.channel === 'sms' ? 'text-[#70a6ff] font-medium' : 'text-[#25d366] font-medium'}>
                      {preset.channel.toUpperCase()}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{preset.senderName}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono">{preset.expectedCategory}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Custom Ingress Simulator */}
          <div className="bg-[#1e1f20] rounded-xl border border-[#2d2f31] p-4 shadow-xs mt-4">
            <h4 className="text-xs font-bold text-[#e3e3e3] uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-[#a8c7fa]" />
              <span>Custom Ingress Simulator</span>
            </h4>
            <form onSubmit={handleRunCustom} className="space-y-3 text-xs">
              <div className="flex gap-4">
                <label className="flex items-center gap-1.5 cursor-pointer text-[#c4c7c5]">
                  <input
                    type="radio"
                    name="channel"
                    value="sms"
                    checked={customChannel === 'sms'}
                    onChange={() => setCustomChannel('sms')}
                  />
                  <span>SMS</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-[#c4c7c5]">
                  <input
                    type="radio"
                    name="channel"
                    value="whatsapp"
                    checked={customChannel === 'whatsapp'}
                    onChange={() => setCustomChannel('whatsapp')}
                  />
                  <span>WhatsApp</span>
                </label>
              </div>

              <div>
                <select
                  value={customContactId}
                  onChange={(e) => setCustomContactId(e.target.value)}
                  className="w-full p-2 bg-[#131314] border border-[#37393b] rounded-lg text-xs text-[#e3e3e3]"
                >
                  {contacts.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.isPermittedForAuto ? 'Authorized for Auto' : 'Approval Required'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <textarea
                  rows={2}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value)}
                  placeholder="Enter custom SMS or WhatsApp message..."
                  className="w-full p-2.5 bg-[#131314] text-[#e3e3e3] border border-[#37393b] rounded-lg text-xs"
                />
              </div>

              <button
                type="submit"
                className="w-full py-2 bg-[#282a2c] hover:bg-[#333538] text-[#a8c7fa] border border-[#37393b] rounded-lg font-semibold transition-colors flex items-center justify-center gap-1.5"
              >
                <span>Run Ingress Pipeline</span>
              </button>
            </form>
          </div>
        </div>

        {/* Right Column: Execution Trace & Invariant Analysis */}
        <div className="lg:col-span-7 space-y-4">
          <div className="flex items-center justify-between px-1">
            <h3 className="text-xs font-bold text-[#8e918f] uppercase tracking-wider">
              Pipeline Execution Trace
            </h3>
            {lastResult && (
              <span className="text-xs text-[#8e918f] font-mono">
                {lastResult.elapsedMs}ms latency
              </span>
            )}
          </div>

          {lastResult ? (
            <div className="space-y-4">
              {/* Top Decision Summary Box */}
              <div
                className={`p-4 rounded-xl border ${
                  lastResult.decision === 'AUTO_SEND_ELIGIBLE'
                    ? 'bg-[#34a853]/10 border-[#34a853]/30 text-[#81c995]'
                    : lastResult.decision === 'BLOCKED_BY_SAFETY'
                    ? 'bg-[#ea4335]/10 border-[#ea4335]/30 text-[#f28b82]'
                    : lastResult.decision === 'DRAFT_ONLY'
                    ? 'bg-[#18191a] border-[#2d2f31] text-[#c4c7c5]'
                    : 'bg-[#fbbc04]/10 border-[#fbbc04]/30 text-[#fdd663]'
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {lastResult.decision === 'AUTO_SEND_ELIGIBLE' && (
                      <CheckCircle2 className="w-5 h-5 text-[#34a853]" />
                    )}
                    {lastResult.decision === 'BLOCKED_BY_SAFETY' && (
                      <ShieldAlert className="w-5 h-5 text-[#ea4335]" />
                    )}
                    {lastResult.decision === 'REQUIRES_APPROVAL' && (
                      <AlertTriangle className="w-5 h-5 text-[#fbbc04]" />
                    )}
                    <span className="font-bold text-sm tracking-tight">
                      Decision: {lastResult.decision}
                    </span>
                  </div>

                  <span className="text-xs font-mono font-semibold px-2.5 py-0.5 rounded bg-[#131314] border border-current">
                    {lastResult.channel.toUpperCase()}
                  </span>
                </div>

                <p className="text-xs leading-relaxed font-sans mb-3">
                  {lastResult.decisionReason}
                </p>

                {lastResult.isAutoEligible && lastResult.simulatedTransmissionId && (
                  <div className="p-2.5 bg-[#34a853]/20 border border-[#34a853]/40 rounded-lg text-xs font-mono text-[#81c995]">
                    ✓ Simulated Auto-Sent (Transmission ID: {lastResult.simulatedTransmissionId})
                  </div>
                )}
              </div>

              {/* Message & Reply Card */}
              <div className="bg-[#1e1f20] rounded-xl border border-[#2d2f31] p-4 shadow-xs space-y-3">
                <div>
                  <span className="text-[11px] font-bold text-[#8e918f] uppercase tracking-wider block mb-1">
                    Ingress Message:
                  </span>
                  <div className="p-3 bg-[#131314] rounded-lg text-xs text-[#e3e3e3] border border-[#282a2c]">
                    "{lastResult.incomingText}"
                  </div>
                </div>

                <div>
                  <span className="text-[11px] font-bold text-[#8e918f] uppercase tracking-wider block mb-1">
                    Gemini Suggested Response:
                  </span>
                  <div className="p-3 bg-[#131314] text-[#e3e3e3] rounded-lg text-xs leading-relaxed border border-[#282a2c]">
                    {lastResult.suggestedText || '(No response generated)'}
                  </div>
                </div>

                {lastResult.alternatives.length > 0 && (
                  <div>
                    <span className="text-[11px] font-bold text-[#8e918f] uppercase tracking-wider block mb-1">
                      Alternative Variations:
                    </span>
                    <ul className="space-y-1 text-xs text-[#8e918f]">
                      {lastResult.alternatives.map((alt, idx) => (
                        <li key={idx} className="p-2 bg-[#131314] rounded border border-[#282a2c] text-[#c4c7c5]">
                          • {alt}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>

              {/* 8-Stage Pipeline Breakdown */}
              <div className="bg-[#1e1f20] rounded-xl border border-[#2d2f31] p-4 shadow-xs">
                <h4 className="text-xs font-bold text-[#e3e3e3] uppercase tracking-wider mb-3 flex items-center gap-2">
                  <GeminiSparkle size={16} />
                  <span>8-Stage Pipeline Trace</span>
                </h4>

                <div className="space-y-2">
                  {lastResult.stages.map((stg, i) => (
                    <div
                      key={i}
                      className="p-3 rounded-lg border border-[#282a2c] bg-[#131314] text-xs flex items-start gap-3"
                    >
                      <div
                        className={`w-5 h-5 rounded-full flex items-center justify-center font-mono text-[10px] font-bold shrink-0 mt-0.5 ${
                          stg.passed
                            ? 'bg-[#34a853]/20 text-[#81c995]'
                            : 'bg-[#ea4335]/20 text-[#f28b82]'
                        }`}
                      >
                        {i + 1}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-0.5">
                          <span className="font-bold text-[#e3e3e3]">
                            {stg.stage} - {stg.title}
                          </span>
                          <span
                            className={`text-[10px] font-semibold ${
                              stg.passed ? 'text-[#81c995]' : 'text-[#f28b82]'
                            }`}
                          >
                            {stg.passed ? 'PASS' : 'FLAGGED / BLOCKED'}
                          </span>
                        </div>
                        <p className="text-[#8e918f] font-sans text-xs">
                          {stg.detail}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-[#1e1f20] rounded-xl border border-[#2d2f31] p-12 text-center text-[#8e918f] text-xs">
              Click "Run" on any scenario on the left, or submit a custom message to inspect the full 8-stage pipeline trace.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
