import React from 'react';

const BrowserFrame = ({ url, onClose }) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
      <div className="w-full h-full max-w-6xl bg-slate-900 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
        <div className="flex items-center justify-between px-4 py-2 bg-slate-950 border-b border-slate-800">
          <span className="text-sm text-slate-400">Browser View</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white">Close</button>
        </div>
        <iframe src={url} className="flex-1 w-full h-full border-0" title="Browser" />
      </div>
    </div>
  );
};

export default BrowserFrame;