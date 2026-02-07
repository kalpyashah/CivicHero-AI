import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import ReactMarkdown from 'react-markdown';
import { jsPDF } from "jspdf";
import { 
  Shield, Send, LogOut, Camera, Mic, Square, CheckCircle, Trash2, 
  User, Phone, MapPin, History, LayoutDashboard, Download, ExternalLink, Loader2, Search, Mail, Home, Settings 
} from 'lucide-react';

function App() {
  // --- 1. ALL STATES (Carefully Preserved) ---
  const [user, setUser] = useState(null);
  const [authStep, setAuthStep] = useState('phone'); 
  const [otpTimer, setOtpTimer] = useState(0);
  const [otpInput, setOtpInput] = useState('');
  const [loginData, setLoginData] = useState({ name: '', phone: '' });
  
  const [activeTab, setActiveTab] = useState('dashboard');
  const [notification, setNotification] = useState(null);
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [flashbackItem, setFlashbackItem] = useState(null);

  const [formData, setFormData] = useState({ city: 'Vadodara', area: '', address: '', domain: 'Potholes', desc: '' });
  const [file, setFile] = useState(null);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [history, setHistory] = useState([]);
  const [schemeSearch, setSchemeSearch] = useState('');

  // --- 2. THE COMPLETE 10 SCHEMES LIST ---
  const schemes = [
    { title: "Ayushman Bharat (PM-JAY)", domain: "Healthcare", link: "https://pmjay.gov.in/" },
    { title: "PM Awas Yojana (PMAY)", domain: "Housing", link: "https://pmay-urban.gov.in/" },
    { title: "Digital India Portal", domain: "Technology", link: "https://www.digitalindia.gov.in/" },
    { title: "PM Jan Dhan Yojana", domain: "Finance", link: "https://pmjdy.gov.in/" },
    { title: "PM-Kisan Samman Nidhi", domain: "Agriculture", link: "https://pmkisan.gov.in/" },
    { title: "Pradhan Mantri Ujjwala Yojana", domain: "Energy", link: "https://www.pmuy.gov.in/" },
    { title: "Skill India Mission", domain: "Education", link: "https://www.skillindia.gov.in/" },
    { title: "Atal Pension Yojana", domain: "Pension", link: "https://www.npscra.nsdl.co.in/" },
    { title: "Make In India", domain: "Industry", link: "https://www.makeinindia.com/" },
    { title: "Swachh Bharat Mission", domain: "Sanitation", link: "https://swachhbharatmission.gov.in/" }
  ];

  // --- 3. EFFECTS & RECURRING LOGIC ---
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  useEffect(() => {
    let interval;
    if (otpTimer > 0) interval = setInterval(() => setOtpTimer(prev => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [otpTimer]);

  const fetchHistory = async () => {
    try {
      const response = await axios.get('http://127.0.0.1:8000/api/history');
      setHistory(response.data);
    } catch (err) { console.log("DB Fetch Failed"); }
  };

  useEffect(() => { if (user) fetchHistory(); }, [user]);

  // Full Audio Logic (Ensured no compression)
  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState(null);
  const mediaRecorder = useRef(null);
  const audioChunks = useRef([]);

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      mediaRecorder.current = new MediaRecorder(stream);
      audioChunks.current = [];
      mediaRecorder.current.ondataavailable = (e) => audioChunks.current.push(e.data);
      mediaRecorder.current.onstop = () => setAudioBlob(new Blob(audioChunks.current, { type: 'audio/webm' }));
      mediaRecorder.current.start();
      setIsRecording(true);
    } catch (err) { alert("Microphone access denied."); }
  };
  const stopRecording = () => { mediaRecorder.current.stop(); setIsRecording(false); };

  // --- 4. PROFESSIONAL PDF EXPORT LOGIC ---
  const downloadPDF = (item) => {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    doc.setFillColor(37, 99, 235);
    doc.rect(0, 0, pageWidth, 40, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(22);
    doc.setFont("helvetica", "bold");
    doc.text("CIVICHERO CASE FILE", 20, 25);
    
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`REPORT ID: #${item.id || 'NEW'}`, 20, 50);
    doc.text(`DATE: ${item.timestamp || new Date().toLocaleString()}`, 20, 56);
    doc.line(20, 62, pageWidth - 20, 62);

    doc.setFont("helvetica", "bold");
    doc.text("CITIZEN DETAILS:", 20, 72);
    doc.setFont("helvetica", "normal");
    doc.text(`Name: ${item.name}`, 20, 78);
    doc.text(`Phone: ${item.phone}`, 20, 84);

    doc.setFont("helvetica", "bold");
    doc.text("LOCATION INFO:", 110, 72);
    doc.setFont("helvetica", "normal");
    doc.text(`${item.area}, ${item.city}`, 110, 78);
    doc.text(`Category: ${item.domain}`, 110, 84);

    doc.line(20, 92, pageWidth - 20, 92);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("MUNICIPAL ACTION GUIDEBOOK (AI Generated)", 20, 105);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    const splitText = doc.splitTextToSize(item.analysis, pageWidth - 40);
    doc.text(splitText, 20, 115);
    doc.save(`CivicHero_Report_${item.id || 'doc'}.pdf`);
  };

  // --- 5. HANDLERS (AUTH & SUBMISSION) ---
  const handleRequestOtp = async (e) => {
    e.preventDefault();
    try {
      const data = new FormData();
      data.append('phone', loginData.phone);
      await axios.post('http://127.0.0.1:8000/api/request-otp', data);
      setAuthStep('otp'); setOtpTimer(30);
      setNotification("🔑 OTP Sent! Check your phone/terminal.");
    } catch (err) { alert("Backend offline. Start main.py."); }
  };

  const handleVerifyOtp = (e) => {
    e.preventDefault();
    setUser({ 
      name: loginData.name, 
      phone: loginData.phone, 
      email: `${loginData.name.toLowerCase().replace(/\s/g, '')}@citizen.in`, 
      residence: "House No. 101, Gokul Dham, Vadodara" 
    });
    setNotification("✅ Access Granted.");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    const data = new FormData();
    data.append('name', user.name);
    data.append('phone', user.phone);
    data.append('city', formData.city);
    data.append('area', formData.area);
    data.append('domain', formData.domain);
    data.append('description', formData.desc);
    data.append('file', file);

    try {
      const response = await axios.post('http://127.0.0.1:8000/api/report', data);
      setResult(response.data.data);
      fetchHistory(); 
      setNotification("📝 Report Filed & SMS Sent!");
    } catch (error) { setNotification("❌ AI Sync Failed."); }
    setLoading(false);
  };

  // --- 6. RENDER LOGIC: LOGIN VIEW ---
  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
        <div className="bg-white rounded-[2.5rem] p-10 w-full max-w-md shadow-2xl text-center animate-in zoom-in duration-300">
            <div className="bg-blue-600 w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-blue-500/30">
              <Shield className="text-white" size={36} />
            </div>
            <h1 className="text-3xl font-black mb-6 uppercase tracking-tighter italic">CivicHero</h1>
            <form onSubmit={authStep === 'phone' ? handleRequestOtp : handleVerifyOtp} className="space-y-4 text-left">
                {authStep === 'phone' ? (
                <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Identity Name</label>
                      <input className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-blue-500 transition-all" placeholder="username" onChange={(e)=>setLoginData({...loginData, name: e.target.value})} required />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Contact Link</label>
                      <input className="w-full p-4 bg-slate-100 rounded-2xl outline-none font-bold focus:ring-2 ring-blue-500 transition-all" placeholder="+91 XXXXX XXXXX" onChange={(e)=>setLoginData({...loginData, phone: e.target.value})} required />
                    </div>
                    <button className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest text-sm hover:bg-blue-700 transition-all">Send OTP</button>
                </>
                ) : (
                <>
                    <div className="space-y-1">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest text-center block mb-2">Enter Verification Code</label>
                      <input className="w-full p-4 bg-slate-100 rounded-2xl outline-none text-center text-3xl font-black tracking-[0.3em] text-blue-600" placeholder="enter otp" maxLength="6" value={otpInput} onChange={(e)=>setOtpInput(e.target.value)} required />
                    </div>
                    <button className="w-full bg-blue-600 text-white font-black py-4 rounded-2xl shadow-xl uppercase tracking-widest text-sm hover:bg-blue-700">Verify Login</button>
                    <div className="text-center mt-4 text-xs font-bold text-slate-400">
                        {otpTimer > 0 ? `Resend available in ${otpTimer}s` : <button type="button" onClick={()=>setOtpTimer(30)} className="text-blue-600 underline uppercase tracking-widest">Resend Now</button>}
                    </div>
                </>
                )}
            </form>
        </div>
      </div>
    );
  }

  // --- 7. MAIN DASHBOARD UI ---
  const filteredSchemes = schemes.filter(s => 
    s.domain.toLowerCase().includes(schemeSearch.toLowerCase()) || 
    s.title.toLowerCase().includes(schemeSearch.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#f8fafc] flex flex-col font-sans text-slate-900">
      {notification && (
        <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[200] bg-slate-900 text-white px-8 py-3 rounded-full shadow-2xl text-xs font-bold uppercase animate-in slide-in-from-top-10">
          {notification}
        </div>
      )}

      <nav className="bg-white border-b sticky top-0 z-[100] shadow-sm flex items-center justify-between px-10 py-5">
        <div className="flex items-center gap-2"><Shield className="text-blue-600" size={32} /><span className="text-2xl font-black uppercase tracking-tighter leading-none">Civic<br/><span className="text-blue-600 text-lg">Hero</span></span></div>
        <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-2 shadow-inner">
          {['dashboard', 'schemes', 'history', 'profile'].map((tab) => (
            <button key={tab} onClick={() => { setActiveTab(tab); setFlashbackItem(null); }} className={`px-6 py-2 rounded-xl font-bold uppercase text-[10px] tracking-widest transition-all ${activeTab === tab ? 'bg-blue-600 text-white shadow-md' : 'text-slate-500 hover:bg-white'}`}>{tab}</button>
          ))}
        </div>
        <button onClick={() => { setUser(null); setAuthStep('phone'); setLoginData({name:'', phone:''}); }} className="text-red-500 font-black text-xs uppercase hover:underline">Logout Session</button>
      </nav>

      <main className="flex-1 p-10 max-w-7xl mx-auto w-full">
        {activeTab === 'dashboard' && (
          <div className={`grid grid-cols-1 ${result || loading ? 'lg:grid-cols-2' : 'max-w-2xl mx-auto'} gap-10 transition-all duration-500`}>
            <div className="bg-white p-10 rounded-[2.5rem] shadow-xl border border-slate-100 text-left animate-in slide-in-from-left-5">
              <h3 className="text-xl font-black mb-8 underline decoration-blue-500/30 underline-offset-8 uppercase tracking-widest">Raise Query</h3>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Name</label>
                    <input className="w-full p-4 bg-slate-100/50 border rounded-2xl outline-none font-bold text-slate-500" value={user.name} disabled />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Phone</label>
                    <input className="w-full p-4 bg-slate-100/50 border rounded-2xl outline-none font-bold text-slate-500" value={user.phone} disabled />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Select City</label>
                    <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none" onChange={(e)=>setFormData({...formData, city:e.target.value})}><option value="Vadodara">Vadodara</option><option value="Ahmedabad">Ahmedabad</option></select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Area</label>
                    <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" placeholder="Area Name" value={formData.area} onChange={(e)=>setFormData({...formData, area:e.target.value})} required />
                  </div>
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Exact Address</label>
                    <input className="w-full p-4 bg-slate-50 border rounded-2xl outline-none font-bold" placeholder="House No, Landmark, Street" value={formData.address} onChange={(e)=>setFormData({...formData, address:e.target.value})} required />
                </div>

                <div className="space-y-1">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Problem Domain</label>
                    <select className="w-full p-4 bg-slate-50 border rounded-2xl font-bold outline-none" onChange={(e)=>setFormData({...formData, domain:e.target.value})}><option value="Potholes">Potholes</option><option value="Sewage">Sewage</option><option value="Waste Management">Waste Management</option><option value="Water Supply">Water Supply</option></select>
                </div>

                <div className="flex items-center gap-4 bg-blue-50 p-4 rounded-2xl border-2 border-dashed border-blue-200">
                  <span className="text-[10px] font-black text-blue-600 uppercase">Voice Evidence</span>
                  {!audioBlob ? (
                    <button type="button" onClick={isRecording ? stopRecording : startRecording} className={`flex items-center gap-2 px-4 py-2 rounded-xl font-bold ${isRecording ? 'bg-red-500 text-white animate-pulse' : 'bg-white text-blue-600 shadow-sm'}`}>{isRecording ? <Square size={14}/> : <Mic size={14}/>}</button>
                  ) : (
                    <div className="flex items-center gap-2 flex-1"><audio src={URL.createObjectURL(audioBlob)} controls className="h-8 flex-1"/><Trash2 size={18} className="text-red-500 cursor-pointer" onClick={()=>setAudioBlob(null)}/></div>
                  )}
                </div>

                <textarea className="w-full p-4 bg-slate-50 border rounded-2xl h-24 outline-none resize-none font-medium" placeholder="Describe the issue in detail..." value={formData.desc} onChange={(e)=>setFormData({...formData, desc:e.target.value})} required={!audioBlob} />
                
                <div className="border-2 border-dashed border-slate-200 p-8 rounded-3xl text-center bg-slate-50 relative hover:border-blue-400 cursor-pointer transition-all">
                  <input type="file" accept="image/*" capture="environment" className="absolute inset-0 opacity-0 cursor-pointer" onChange={(e)=>setFile(e.target.files[0])} required />
                  <Camera className="mx-auto text-blue-400 mb-2" size={32} />
                  <p className="text-xs font-bold text-slate-400">{file ? file.name : "Capture Live Photo Evidence"}</p>
                </div>
                <button disabled={loading} className="w-full py-5 bg-blue-600 text-white font-black rounded-2xl shadow-xl hover:bg-blue-700 uppercase tracking-widest text-sm transition-all">{loading ? "Agentic AI Syncing..." : "SUBMIT REPORT"}</button>
              </form>
            </div>
            
            {(loading || result) && (
              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col min-h-[500px] text-left animate-in slide-in-from-right-10">
                {loading ? <div className="m-auto flex flex-col items-center"><Loader2 className="animate-spin text-blue-600 mb-4" size={48} /><p className="font-black text-blue-600 uppercase tracking-widest">Analyzing Evidence...</p></div> : 
                <><div className="bg-slate-900 p-8 text-white flex justify-between items-center border-b-4 border-blue-600"><h3 className="font-black uppercase tracking-tight">AI Guidebook</h3><button onClick={()=>downloadPDF(result)}><Download size={20}/></button></div>
                <div className="p-10 flex-1 overflow-y-auto prose prose-slate max-w-none">
                    <ReactMarkdown>{result.analysis}</ReactMarkdown>
                    <button onClick={()=>{setResult(null); setFormData({...formData, desc: '', address: '', area: ''}); setFile(null); setAudioBlob(null);}} className="mt-8 bg-slate-900 w-full py-4 rounded-2xl text-xs font-black text-white uppercase tracking-widest hover:bg-blue-600 transition-all">New Complaint</button>
                </div></>}
              </div>
            )}
          </div>
        )}

        {activeTab === 'schemes' && (
          <div className="space-y-8 animate-in zoom-in-95 text-left">
            <div className="bg-white p-8 rounded-3xl shadow-xl border flex items-center gap-4"><Search className="text-blue-500" /><input className="w-full outline-none font-bold text-lg" placeholder="Search across 10+ Government Portals..." onChange={(e)=>setSchemeSearch(e.target.value)} /></div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredSchemes.map((s, idx) => (
                  <div key={idx} className="bg-white p-8 rounded-[2rem] border-l-8 border-blue-600 shadow-sm hover:shadow-xl transition-all flex flex-col justify-between h-full">
                    <div>
                        <span className="text-[10px] font-black text-blue-600 uppercase tracking-widest bg-blue-50 px-3 py-1 rounded-full">{s.domain}</span>
                        <h4 className="text-lg font-black mt-4 mb-4 leading-tight">{s.title}</h4>
                    </div>
                    <a href={s.link} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-slate-400 font-bold hover:text-blue-600 transition-colors text-[10px] uppercase tracking-widest">Visit Official Portal <ExternalLink size={14}/></a>
                  </div>
                ))}
            </div>
          </div>
        )}

        {activeTab === 'history' && (
          <div className="space-y-6 text-left">
            {!flashbackItem ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in">
                {history.length > 0 ? history.map((h, i) => (
                  <div key={i} onClick={()=>setFlashbackItem(h)} className="bg-white p-8 rounded-[2rem] border shadow-sm hover:border-blue-400 transition-all cursor-pointer"><div className="flex justify-between text-[10px] font-black uppercase text-slate-400 mb-4"><span>{h.city}</span><span>{h.timestamp}</span></div><h4 className="font-black text-slate-800 uppercase leading-none tracking-tighter italic">{h.domain} Issue</h4><p className="text-[10px] text-blue-500 font-black uppercase mt-4">View Report Flashback →</p></div>
                )) : <div className="col-span-full py-20 text-center opacity-20"><History size={64} className="mx-auto mb-4"/><p className="font-black uppercase tracking-widest">No reports archived yet</p></div>}
              </div>
            ) : (
              <div className="bg-white rounded-[2.5rem] shadow-2xl overflow-hidden border border-slate-100 flex flex-col animate-in slide-in-from-bottom-5">
                <div className="bg-slate-900 p-8 text-white flex justify-between items-center"><h3 className="font-black uppercase tracking-tight">Report Flashback</h3><button onClick={()=>setFlashbackItem(null)} className="text-xs font-black uppercase hover:underline">Exit Archive ✕</button></div>
                <div className="p-10 prose prose-slate max-w-none text-left"><ReactMarkdown>{flashbackItem.analysis}</ReactMarkdown><button onClick={()=>downloadPDF(flashbackItem)} className="mt-4 bg-blue-600 text-white px-6 py-2 rounded-xl text-xs font-bold uppercase tracking-widest shadow-md">Download Case Copy</button></div>
              </div>
            )}
          </div>
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto bg-white p-12 rounded-[3rem] shadow-xl border border-slate-100 animate-in zoom-in-95 text-left">
            <div className="flex items-center gap-8 mb-10 pb-10 border-b">
              <div className="w-24 h-24 bg-blue-600 rounded-3xl flex items-center justify-center text-white text-4xl font-black shadow-lg shadow-blue-200">{user.name.charAt(0)}</div>
              <div><h3 className="text-3xl font-black text-slate-900">{user.name}</h3><p className="text-blue-500 font-black uppercase tracking-widest text-[10px]">Verified Digital Identity</p></div>
            </div>
            
            <div className="space-y-6">
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><User size={14}/> Full Name</label>
                    <input disabled={!isEditingProfile} className={`w-full p-4 rounded-2xl border outline-none font-bold transition-all ${isEditingProfile ? 'bg-white border-blue-500 ring-2 ring-blue-100 shadow-md' : 'bg-slate-50 border-transparent'}`} value={user.name} onChange={(e) => setUser({...user, name: e.target.value})}/>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Mail size={14}/> Phone No.</label>
                    <input disabled={!isEditingProfile} className={`w-full p-4 rounded-2xl border outline-none font-bold transition-all ${isEditingProfile ? 'bg-white border-blue-500 ring-2 ring-blue-100 shadow-md' : 'bg-slate-50 border-transparent'}`} value={user.phone} onChange={(e) => setUser({...user, email: e.target.value})}/>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Mail size={14}/> Primary Email</label>
                    <input disabled={!isEditingProfile} className={`w-full p-4 rounded-2xl border outline-none font-bold transition-all ${isEditingProfile ? 'bg-white border-blue-500 ring-2 ring-blue-100 shadow-md' : 'bg-slate-50 border-transparent'}`} value={user.email} onChange={(e) => setUser({...user, email: e.target.value})}/>
                </div>
                <div className="flex flex-col gap-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Home size={14}/> Residential Base</label>
                    <textarea disabled={!isEditingProfile} className={`w-full p-4 rounded-2xl border outline-none font-bold h-24 resize-none transition-all ${isEditingProfile ? 'bg-white border-blue-500 ring-2 ring-blue-100 shadow-md' : 'bg-slate-50 border-transparent'}`} value={user.residence} onChange={(e) => setUser({...user, residence: e.target.value})}/>
                </div>
            </div>

            <button onClick={() => { if(isEditingProfile) setNotification("✅ Profile Updated Successfully!"); setIsEditingProfile(!isEditingProfile); }} className={`w-full mt-10 py-5 rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl transition-all ${isEditingProfile ? 'bg-emerald-500 text-white' : 'bg-slate-900 text-white hover:bg-slate-800'}`}>
              {isEditingProfile ? "Lock & Save Changes" : "Update Profile Details"}
            </button>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;