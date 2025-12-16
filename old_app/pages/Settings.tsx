import React, { useState } from 'react';
import { User, Bell, Shield, LogOut, Lock, Database, ChevronRight, Terminal, CheckCircle2, AlertOctagon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { runRegressionTests } from '../finance/tests';

const Settings: React.FC = () => {
  const [testResult, setTestResult] = useState<{passed: number, failed: number} | null>(null);

  const handleSignOut = () => {
    // Placeholder for sign out logic
    alert("Session ended.");
  };

  const runTests = () => {
      const result = runRegressionTests();
      setTestResult(result);
  };

  return (
    <div className="space-y-8 pt-4 pb-20">
      <header className="px-2">
        <h1 className="text-3xl font-black text-slate-800 mb-2">Settings</h1>
        <p className="text-slate-400 font-medium">Manage preferences & data.</p>
      </header>

      {/* Financial Data Section */}
      <div className="space-y-3">
        <h2 className="text-xs font-black text-slate-300 uppercase tracking-widest px-2">Data Management</h2>
        <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm">
            <Link to="/finances" className="w-full flex items-center justify-between p-5 hover:bg-slate-50 active:bg-slate-100 transition-colors"
              aria-label="View and manage money log, transactions and recurring bills"
            >
                <div className="flex items-center space-x-4">
                    <div className="bg-indigo-100 p-2 rounded-xl text-[#492582]">
                        <Database size={20} />
                    </div>
                    <div>
                        <span className="text-slate-800 font-bold block">Money Log</span>
                        <span className="text-xs text-slate-400 font-medium">Transactions & recurring bills</span>
                    </div>
                </div>
                <ChevronRight size={20} className="text-slate-300" />
            </Link>
        </div>
      </div>

      {/* Account Section - Disabled for MVP */}
      <div className="space-y-3">
        <h2 className="text-xs font-black text-slate-300 uppercase tracking-widest px-2">Account</h2>
        <div className="bg-slate-50 rounded-3xl border-2 border-slate-100 overflow-hidden opacity-60">
            <div className="w-full flex items-center justify-between p-5 border-b-2 border-slate-100 cursor-not-allowed">
                <div className="flex items-center space-x-4">
                    <User size={24} className="text-slate-400" />
                    <span className="text-slate-500 font-bold">Profile Details</span>
                </div>
                <Lock size={16} className="text-slate-300" />
            </div>
            <div className="w-full flex items-center justify-between p-5 cursor-not-allowed">
                <div className="flex items-center space-x-4">
                    <Shield size={24} className="text-slate-400" />
                    <span className="text-slate-500 font-bold">Security</span>
                </div>
                <Lock size={16} className="text-slate-300" />
            </div>
        </div>
      </div>

      {/* QA & Diagnostics (New) */}
      <div className="space-y-3">
        <h2 className="text-xs font-black text-slate-300 uppercase tracking-widest px-2">QA & Diagnostics</h2>
        <div className="bg-white rounded-3xl border-2 border-slate-200 overflow-hidden shadow-sm p-5 space-y-4">
             <div className="flex items-center gap-3">
                 <div className="bg-slate-100 p-2 rounded-xl text-slate-600"><Terminal size={20} /></div>
                 <div className="flex-1">
                     <h3 className="text-sm font-bold text-slate-800">Regression Suite</h3>
                     <p className="text-xs text-slate-400">Verify logic integrity</p>
                 </div>
             </div>
             
             {testResult ? (
                 <div className={`p-4 rounded-2xl flex items-center gap-3 ${testResult.failed === 0 ? 'bg-green-50 text-green-700' : 'bg-rose-50 text-rose-700'}`}>
                     {testResult.failed === 0 ? <CheckCircle2 size={20} /> : <AlertOctagon size={20} />}
                     <div className="text-sm font-bold">
                         {testResult.passed} Passed, {testResult.failed} Failed
                     </div>
                 </div>
             ) : (
                <button 
                    onClick={runTests}
                    className="w-full py-3 bg-slate-800 text-white rounded-xl font-bold text-sm hover:bg-slate-700 active:scale-95 transition-all"
                    aria-label="Run integrity checks for financial logic"
                >
                    Run Integrity Checks
                </button>
             )}
        </div>
      </div>

      {/* Primary Action: Sign Out */}
      <button 
        onClick={handleSignOut}
        className="w-full p-4 mt-8 flex items-center justify-center space-x-2 text-[#ff7418] font-bold border-2 border-[#ff7418] rounded-2xl hover:bg-orange-50 active:scale-95 transition-all"
        aria-label="Sign out of the application"
      >
        <LogOut size={20} strokeWidth={2.5} />
        <span>Sign Out</span>
      </button>

      <div className="text-center pt-8 pb-4">
          <p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Capital Hero v0.1.0 MVP</p>
      </div>
    </div>
  );
};

export default Settings;