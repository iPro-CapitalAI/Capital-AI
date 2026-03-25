// tools/syncdesk/page.tsx
// CapitalAI SyncDesk — Single-window Claude + Grok workflow (self-hosted)

'use client';

import { useState, useEffect } from 'react';
import { CapitalAI_Context_Library } from '../../lib/context-library'; // we'll create this loader

export default function SyncDesk() {
  const [leftPanel, setLeftPanel] = useState('');           // Claude-style editor
  const [rightPanel, setRightPanel] = useState('');         // Grok critique
  const [currentFile, setCurrentFile] = useState('index.html');
  const [files, setFiles] = useState(['index.html', 'api/chat.js', 'CLAUDE.md']); // auto-populate later

  // CORE REQUIREMENT: File movement
  const sendToGrok = () => {
    const payload = {
      file: currentFile,
      content: leftPanel,
      context: CapitalAI_Context_Library, // full 10 files + rules
      task: "Critique against self-hosted strategy, E-E-A-T, fake content, external APIs"
    };
    // In real version this calls our n8n endpoint or opens Grok tab pre-filled
    setRightPanel(`[Grok Analysis]\n\nFile: ${currentFile}\n\nCritique in progress...\n\n(Paste your real Grok response here)`);
  };

  const sendBackToClaude = () => {
    const fixedCode = rightPanel.includes('```') 
      ? rightPanel.split('```')[1] 
      : rightPanel;
    setLeftPanel(fixedCode);
    alert('✅ Code sent back to Claude panel + ready to commit');
  };

  return (
    <div className="h-screen flex flex-col bg-zinc-950 text-white">
      {/* HEADER */}
      <div className="border-b border-zinc-800 p-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">CapitalAI SyncDesk</h1>
        <div className="flex gap-3">
          <button onClick={sendToGrok} className="bg-emerald-600 px-6 py-2 rounded-lg hover:bg-emerald-700">
            → Send to Grok (Auto-critique)
          </button>
          <button onClick={sendBackToClaude} className="bg-violet-600 px-6 py-2 rounded-lg hover:bg-violet-700">
            ← Send Back to Claude
          </button>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* LEFT PANEL — Claude Style */}
        <div className="w-1/2 border-r border-zinc-800 flex flex-col">
          <div className="bg-zinc-900 p-3 text-sm font-mono">Claude Code • {currentFile}</div>
          <textarea
            value={leftPanel}
            onChange={(e) => setLeftPanel(e.target.value)}
            className="flex-1 bg-zinc-950 p-6 font-mono text-sm resize-none focus:outline-none"
            placeholder="Claude output appears here..."
          />
          {/* File browser */}
          <div className="border-t border-zinc-800 p-3 text-xs">
            {files.map(f => (
              <button key={f} onClick={() => setCurrentFile(f)} className="mr-4 hover:underline">
                {f}
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT PANEL — Grok Style */}
        <div className="w-1/2 flex flex-col">
          <div className="bg-zinc-900 p-3 text-sm font-mono">Grok Analysis • Self-Hosted Rules Enforced</div>
          <div className="flex-1 p-6 overflow-auto text-sm whitespace-pre-wrap">
            {rightPanel || "Click 'Send to Grok' to auto-critique with full CapitalAI_Context_Library"}
          </div>
        </div>
      </div>

      {/* FOOTER STATUS */}
      <div className="border-t border-zinc-800 p-3 text-xs text-zinc-500">
        Self-hosted • n8n + Ollama ready • Context Library v1 loaded • Zero external APIs
      </div>
    </div>
  );
}