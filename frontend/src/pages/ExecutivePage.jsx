import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import logo from "../assets/zuca-logo.png"
import { 
  Crown, Mic, Church, Camera, Music, Users,
  Phone, Mail, Calendar, Shield, Star, Award,
  ArrowLeft, Home, Briefcase, User, Mail as MailIcon,
  PhoneCall, CalendarDays, Clock, CheckCircle,
  X, ExternalLink, ZoomIn, History, ChevronDown
} from 'lucide-react';
import { formatDistance, format } from 'date-fns';

const WhatsAppIcon = ({ size = 20 }) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M3 21l1.65-3.8a9 9 0 1 1 3.4 2.9l-5.05 1.9z" />
    <path d="M9 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z" />
    <path d="M14 10a.5.5 0 0 0 1 0V9a.5.5 0 0 0-1 0v1z" />
    <path d="M12 15a4 4 0 0 0-4-4" />
  </svg>
);

export default function ExecutivePage() {
  const navigate = useNavigate();
  const [executives, setExecutives] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedMember, setSelectedMember] = useState(null);
  const [showFullImage, setShowFullImage] = useState(false);
  const [activeTab, setActiveTab] = useState('current');
  const [executiveHistory, setExecutiveHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    fetchExecutiveTeam();
  }, []);

  useEffect(() => {
    if (activeTab === 'history') {
      fetchExecutiveHistory();
    }
  }, [activeTab]);

  const fetchExecutiveTeam = async () => {
    try {
      const res = await api.get('/api/executive/team');
      setExecutives(res.data.executives);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchExecutiveHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/api/executive/history');
      setExecutiveHistory(res.data.history);
    } catch (error) {
      console.error('Error fetching history:', error);
    } finally {
      setHistoryLoading(false);
    }
  };

  const getMember = (role) => {
    return executives.find(e => e.role === role);
  };

  const handleWhatsApp = (phone) => {
    if (phone) window.open(`https://wa.me/${phone.replace(/[^0-9]/g, '')}`, '_blank');
  };

  const handleCall = (phone) => {
    if (phone) window.location.href = `tel:${phone}`;
  };

  const handleEmail = (email) => {
    if (email) window.location.href = `mailto:${email}`;
  };

  const goBack = () => navigate(-1);
  const goHome = () => navigate('/dashboard');

  const chair = getMember('Chairperson');
  const viceChair = getMember('Vice Chairperson');
  const secretary = getMember('Secretary');
  const viceSecretary = getMember('Vice Secretary');
  const treasurer = getMember('Treasurer');
  const choirMod = getMember('Choir Moderator');
  const viceChoir = getMember('Vice Choir Moderator');
  const mediaMod = getMember('Media Moderator');
  
  const jumuiaMods = [
    getMember('St. Michael Moderator'),
    getMember('St. Benedict Moderator'),
    getMember('St. Peregrine Moderator'),
    getMember('Christ the King Moderator'),
    getMember('St. Gregory Moderator'),
    getMember('St. Pacificus Moderator')
  ].filter(Boolean);

  const voiceReps = [
    getMember('BASS Voice Rep'),
    getMember('TENOR Voice Rep'),
    getMember('ALTO Voice Rep'),
    getMember('SOPRANO Voice Rep')
  ].filter(Boolean);

  const MemberCard = ({ member, onClick, department }) => {
    if (!member) {
      return (
        <div className="member-card vacant">
          <div className="vacant-icon">○</div>
          <p>Position Vacant</p>
        </div>
      );
    }
    
    let deptColor = '';
    let deptGradient = '';
    if (department === 'leadership') {
      deptColor = '#3b82f6';
      deptGradient = 'linear-gradient(135deg, #3b82f6, #2563eb)';
    } else if (department === 'choir') {
      deptColor = '#8b5cf6';
      deptGradient = 'linear-gradient(135deg, #8b5cf6, #7c3aed)';
    } else if (department === 'jumuia') {
      deptColor = '#10b981';
      deptGradient = 'linear-gradient(135deg, #10b981, #059669)';
    } else if (department === 'media') {
      deptColor = '#f59e0b';
      deptGradient = 'linear-gradient(135deg, #f59e0b, #d97706)';
    } else if (department === 'voice') {
      deptColor = '#ef4444';
      deptGradient = 'linear-gradient(135deg, #ef4444, #dc2626)';
    }
    
    return (
      <div className="member-card" style={{ borderTop: `3px solid ${deptColor}` }} onClick={() => onClick(member)}>
        <div className="card-avatar">
          {member.profileImage ? (
            <img src={member.profileImage} alt={member.name} />
          ) : (
            <div className="avatar-initial" style={{ background: deptGradient }}>
              {member.name.charAt(0)}
            </div>
          )}
        </div>
        <h3>{member.name}</h3>
        <p className="role">{member.role}</p>
        <div className="card-actions">
          {member.phone && (
            <>
              <button className="wa-btn" onClick={(e) => { e.stopPropagation(); handleWhatsApp(member.phone); }} title="WhatsApp">
                <WhatsAppIcon size={14} />
              </button>
              <button className="call-btn" onClick={(e) => { e.stopPropagation(); handleCall(member.phone); }} title="Call">
                <Phone size={14} />
              </button>
            </>
          )}
          {member.email && (
            <button className="mail-btn" onClick={(e) => { e.stopPropagation(); handleEmail(member.email); }} title="Email">
              <Mail size={14} />
            </button>
          )}
        </div>
      </div>
    );
  };


  return (
    <div className="executive-page">
      {/* Premium Hero Section */}
      <div className="premium-hero">
        <div className="hero-particles">
          {[...Array(10)].map((_, i) => <div key={i} className="particle"></div>)}
        </div>
        <div className="hero-glow"></div>
        
        <div className="nav-bar">
          <button className="nav-btn back" onClick={goBack}>
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <button className="nav-btn home" onClick={goHome}>
            <Home size={18} />
            <span>Dashboard</span>
          </button>
        </div>

        <div className="hero-content">
          <div className="hero-badge">
           <img src={logo} alt="Loading..." style={{ width: '27px', height: '37px' }} />
            <span>ZUCA EXECUTIVE COUNCIL</span>
          </div>
          <h1>Organizational Structure</h1>
          <p>Leadership hierarchy of Zetech University Catholic Action</p>
          <div className="hero-stats">
            <div className="stat"><Users size={16} /><span>{executives.length} Leaders</span></div>
            <div className="stat"><Briefcase size={16} /><span>5 Departments</span></div>
            <div className="stat"><Award size={16} /><span>18 Positions</span></div>
          </div>
        </div>
        <div className="hero-wave">
          <svg viewBox="0 0 1200 120" preserveAspectRatio="none">
            <path d="M0,0V46.29c47.79,22.2,103.59,32.17,158,28,70.36-5.37,136.33-33.31,206.8-37.5C438.64,32.43,512.34,53.67,583,72.05c69.27,18,138.3,24.88,209.4,13.08,36.15-6,69.85-17.84,104.45-29.34C989.49,25,1113-14.29,1200,52.47V0Z" opacity=".25" fill="white"></path>
            <path d="M0,0V15.81C13,21.25,27.93,25.67,44.24,28.45c69.76,11.6,136.47,7.22,206.42-5.49C369.5,5.71,470.33,39.18,569,66.43c96.58,26.92,193.44,35.91,289.91,25.58C948.56,80.58,1046.7,45.79,1143,57.21c51.76,5.86,101.78,21.14,148,42.25V0Z" fill="white"></path>
          </svg>
        </div>
      </div>

      {/* Tabs */}
      <div className="executive-tabs">
        <button 
          className={`tab-btn ${activeTab === 'current' ? 'active' : ''}`}
          onClick={() => setActiveTab('current')}
        >
          <Users size={16} />
          <span>Current Leadership</span>
        </button>
        <button 
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          <History size={16} />
          <span>Leadership History</span>
        </button>
      </div>

      {/* Current Leadership View */}
      {activeTab === 'current' && (
        <>
        <div className="org-chart">
  {/* Static Leadership Section - Keep existing structure */}
  <div className="org-level">
    <div className="org-node-wrapper">
      <div className="org-node">
        <MemberCard member={chair} onClick={setSelectedMember} department="leadership" />
      </div>
    </div>
  </div>

  <div className="org-connector vertical">
    <div className="connector-line"></div>
  </div>

  <div className="org-level">
    <div className="org-node-wrapper">
      <div className="org-node">
        <MemberCard member={viceChair} onClick={setSelectedMember} department="leadership" />
      </div>
    </div>
  </div>

  <div className="org-connector split">
    <div className="connector-line"></div>
    <div className="connector-horizontal"></div>
  </div>

  <div className="org-level two-cols">
    <div className="org-node-wrapper">
      <div className="org-node">
        <MemberCard member={secretary} onClick={setSelectedMember} department="leadership" />
      </div>
    </div>
    <div className="org-node-wrapper">
      <div className="org-node">
        <MemberCard member={viceSecretary} onClick={setSelectedMember} department="leadership" />
      </div>
    </div>
  </div>

  <div className="org-connector vertical">
    <div className="connector-line"></div>
  </div>

  <div className="org-level">
    <div className="org-node-wrapper">
      <div className="org-node">
        <MemberCard member={treasurer} onClick={setSelectedMember} department="leadership" />
      </div>
    </div>
  </div>

  {/* Choir Department */}
  <div className="dept-separator choir">
    <div className="dept-dot"></div>
    <span>CHOIR DEPARTMENT</span>
    <div className="dept-line"></div>
  </div>

  <div className="org-connector split">
    <div className="connector-line"></div>
    <div className="connector-horizontal"></div>
  </div>

  <div className="org-level two-cols">
    <div className="org-node-wrapper">
      <div className="org-node">
        <MemberCard member={choirMod} onClick={setSelectedMember} department="choir" />
      </div>
    </div>
    <div className="org-node-wrapper">
      <div className="org-node">
        <MemberCard member={viceChoir} onClick={setSelectedMember} department="choir" />
      </div>
    </div>
  </div>

  <div className="org-connector vertical">
    <div className="connector-line"></div>
  </div>

  {/* Media Department */}
  <div className="dept-separator media">
    <div className="dept-dot"></div>
    <span>MEDIA DEPARTMENT</span>
    <div className="dept-line"></div>
  </div>

  <div className="org-connector vertical">
    <div className="connector-line"></div>
  </div>

  <div className="org-level">
    <div className="org-node-wrapper">
      <div className="org-node">
        <MemberCard member={mediaMod} onClick={setSelectedMember} department="media" />
      </div>
    </div>
  </div>

  {/* Voice Representatives */}
  <div className="dept-separator voice">
    <div className="dept-dot"></div>
    <span>VOICE REPRESENTATIVES</span>
    <div className="dept-line"></div>
  </div>

  <div className="org-connector wide">
    <div className="connector-line"></div>
    <div className="connector-horizontal-wide"></div>
  </div>

  <div className="org-level four-cols">
    {voiceReps.map((rep, idx) => (
      <div key={idx} className="org-node-wrapper">
        <div className="org-node">
          <MemberCard member={rep} onClick={setSelectedMember} department="voice" />
        </div>
      </div>
    ))}
  </div>

  {/* Jumuia Moderators */}
  <div className="dept-separator jumuia">
    <div className="dept-dot"></div>
    <span>JUMUIA MODERATORS</span>
    <div className="dept-line"></div>
  </div>

  <div className="org-connector wide">
    <div className="connector-line"></div>
    <div className="connector-horizontal-wide"></div>
  </div>

  <div className="org-level six-cols">
    {jumuiaMods.map((mod, idx) => (
      <div key={idx} className="org-node-wrapper">
        <div className="org-node">
          <MemberCard member={mod} onClick={setSelectedMember} department="jumuia" />
        </div>
      </div>
    ))}
  </div>

   {/* ===== DYNAMIC CUSTOM DEPARTMENTS (Show any new departments added by admin) ===== */}
  {Object.entries(executives.reduce((acc, exec) => {
    const category = exec.category;
    if (!['leadership', 'choir', 'jumuia', 'media', 'voice'].includes(category)) {
      if (!acc[category]) acc[category] = [];
      acc[category].push(exec);
    }
    return acc;
  }, {})).map(([category, members], deptIndex) => (
    <div key={category}>
      {/* Vertical connector line FROM previous section to this department */}
      <div className="org-connector vertical">
        <div className="connector-line"></div>
      </div>

      {/* Department Separator */}
      <div className="dept-separator" style={{ borderColor: '#64748b' }}>
        <div className="dept-dot" style={{ background: '#64748b' }}></div>
        <span>{category.toUpperCase()} DEPARTMENT</span>
        <div className="dept-line"></div>
      </div>

      {/* Split connector if multiple members, otherwise single vertical */}
      {members.length > 1 ? (
        <div className="org-connector split">
          <div className="connector-line"></div>
          <div className="connector-horizontal"></div>
        </div>
      ) : (
        <div className="org-connector vertical">
          <div className="connector-line"></div>
        </div>
      )}

      {/* Members Grid */}
      <div className={`org-level ${members.length <= 2 ? 'two-cols' : members.length <= 4 ? 'four-cols' : 'six-cols'}`}>
        {members.map((member, idx) => (
          <div key={idx} className="org-node-wrapper">
            <div className="org-node">
              <MemberCard member={member} onClick={setSelectedMember} department={category} />
            </div>
          </div>
        ))}
      </div>
    </div>
  ))}
</div>

        <div className="legend">
  <div className="legend-title">Departments</div>
  <div className="legend-items">
    <div className="legend-item"><div className="legend-color leadership"></div><span>Leadership</span></div>
    <div className="legend-item"><div className="legend-color choir"></div><span>Choir</span></div>
    <div className="legend-item"><div className="legend-color jumuia"></div><span>Jumuia</span></div>
    <div className="legend-item"><div className="legend-color media"></div><span>Media</span></div>
    <div className="legend-item"><div className="legend-color voice"></div><span>Voice</span></div>
    {Object.keys(executives.reduce((acc, exec) => {
      const cat = exec.category;
      if (!['leadership', 'choir', 'jumuia', 'media', 'voice'].includes(cat)) acc[cat] = true;
      return acc;
    }, {})).map(category => (
      <div key={category} className="legend-item">
        <div className="legend-color" style={{ background: '#64748b' }}></div>
        <span>{category.charAt(0).toUpperCase() + category.slice(1)}</span>
      </div>
    ))}
  </div>
    </div>
      </>
      )}


      {/* History View */}
      {activeTab === 'history' && (
        <div className="history-view">
          {historyLoading ? (
            <div className="history-loading-state">
              <div className="loader-spinner-small"></div>
              <p>Loading history...</p>
            </div>
          ) : executiveHistory.length === 0 ? (
            <div className="history-empty-state">
              <History size={48} strokeWidth={1} />
              <p>No executive history available</p>
            </div>
          ) : (
            <div className="history-list">
              {executiveHistory.map((record) => (
                <div key={record.id} className="history-card">
                  <div className="history-card-avatar">
                    {record.profileImage ? (
                      <img src={record.profileImage} alt={record.name} />
                    ) : (
                      <div className="history-avatar-placeholder">{record.name.charAt(0)}</div>
                    )}
                  </div>
                  <div className="history-card-info">
                    <h4>{record.name}</h4>
                    <p>{record.role}</p>
                    <small>
                      {format(new Date(record.assignedAt), 'MMMM d, yyyy')}
                      {record.removedAt && ` - ${format(new Date(record.removedAt), 'MMMM d, yyyy')}`}
                    </small>
                  </div>
                  <div className={`history-category-badge ${record.category}`}>
                    {record.category}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {selectedMember && (
        <div className="profile-modal" onClick={() => setSelectedMember(null)}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setSelectedMember(null)}><X size={20} /></button>
            <div className="modal-header" style={{ background: `linear-gradient(135deg, ${selectedMember.category === 'leadership' ? '#3b82f6' : selectedMember.category === 'choir' ? '#8b5cf6' : selectedMember.category === 'jumuia' ? '#10b981' : selectedMember.category === 'media' ? '#f59e0b' : '#ef4444'}, #1e293b)` }}>
              <div className="modal-avatar-wrapper">
                <div className="modal-avatar" onClick={() => setShowFullImage(true)}>
                  {selectedMember.profileImage ? <img src={selectedMember.profileImage} alt={selectedMember.name} /> : <div className="avatar-large">{selectedMember.name.charAt(0)}</div>}
                  <div className="avatar-zoom"><ZoomIn size={16} /></div>
                </div>
              </div>
              <h2>{selectedMember.name}</h2>
              <p className="modal-role">{selectedMember.role}</p>
              <div className="modal-badge"><Award size={14} /><span>Level {selectedMember.level}</span></div>
            </div>
            <div className="modal-body">
              <div className="info-card">
                <h3><PhoneCall size={16} /> Contact Information</h3>
                <div className="info-list">
                  {selectedMember.phone && (
                    <div className="info-item">
                      <Phone size={16} className="info-icon" />
                      <div className="info-content"><span className="info-label">Phone Number</span><span className="info-value">{selectedMember.phone}</span></div>
                      <div className="info-actions">
                        <button onClick={() => handleCall(selectedMember.phone)} className="action-call"><Phone size={14} /> Call</button>
                        <button onClick={() => handleWhatsApp(selectedMember.phone)} className="action-wa"><WhatsAppIcon size={14} /> WhatsApp</button>
                      </div>
                    </div>
                  )}
                  {selectedMember.email && (
                    <div className="info-item">
                      <MailIcon size={16} className="info-icon" />
                      <div className="info-content"><span className="info-label">Email Address</span><span className="info-value">{selectedMember.email}</span></div>
                      <button onClick={() => handleEmail(selectedMember.email)} className="action-mail"><Mail size={14} /> Send Email</button>
                    </div>
                  )}
                </div>
              </div>
              <div className="info-card">
                <h3><Star size={16} /> Executive Details</h3>
                <div className="details-grid">
                  <div className="detail-item"><Shield size={16} /><span>Position</span><strong>{selectedMember.role}</strong></div>
                  <div className="detail-item"><Award size={16} /><span>Level</span><strong>Level {selectedMember.level}</strong></div>
                  <div className="detail-item"><Briefcase size={16} /><span>Department</span><strong>{selectedMember.category?.toUpperCase()}</strong></div>
                  {selectedMember.assignedAt && (<div className="detail-item"><CalendarDays size={16} /><span>Assigned Date</span><strong>{format(new Date(selectedMember.assignedAt), 'MMMM d, yyyy')}</strong></div>)}
                  {selectedMember.assignedAt && (<div className="detail-item"><Clock size={16} /><span>Tenure</span><strong>{formatDistance(new Date(selectedMember.assignedAt), new Date(), { addSuffix: true })}</strong></div>)}
                  <div className="detail-item"><CheckCircle size={16} /><span>Status</span><strong className="status-active">Active</strong></div>
                </div>
              </div>
              <div className="info-card">
                <h3><ExternalLink size={16} /> Quick Actions</h3>
                <div className="quick-actions">
                  {selectedMember.phone && (<><button className="quick-action wa" onClick={() => handleWhatsApp(selectedMember.phone)}><WhatsAppIcon size={18} /><span>WhatsApp</span></button><button className="quick-action call" onClick={() => handleCall(selectedMember.phone)}><Phone size={18} /><span>Voice Call</span></button></>)}
                  {selectedMember.email && (<button className="quick-action email" onClick={() => handleEmail(selectedMember.email)}><Mail size={18} /><span>Send Email</span></button>)}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {showFullImage && selectedMember?.profileImage && (
        <div className="full-image-modal" onClick={() => setShowFullImage(false)}>
          <div className="full-image-container" onClick={e => e.stopPropagation()}>
            <button className="full-image-close" onClick={() => setShowFullImage(false)}><X size={24} /></button>
            <img src={selectedMember.profileImage} alt={selectedMember.name} />
            <div className="full-image-caption"><h3>{selectedMember.name}</h3><p>{selectedMember.role}</p></div>
          </div>
        </div>
      )}

      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }

        .executive-page {
          min-height: 100vh;
          background: linear-gradient(135deg, #f0f4f8 0%, #e2e8f0 100%);
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        }

        .premium-hero {
          position: relative;
          background: linear-gradient(135deg, #0f172a 0%, #1e293b 50%, #0f172a 100%);
          padding: 20px 24px 80px;
          overflow: hidden;
        }

        .hero-particles { position: absolute; inset: 0; overflow: hidden; }
        .particle { position: absolute; background: rgba(255,255,255,0.08); border-radius: 50%; animation: float 15s infinite ease-in-out; }
        .particle:nth-child(1) { width: 80px; height: 80px; top: 10%; left: 5%; animation-delay: 0s; }
        .particle:nth-child(2) { width: 120px; height: 120px; top: 60%; right: 8%; animation-delay: 2s; }
        .particle:nth-child(3) { width: 60px; height: 60px; top: 30%; left: 20%; animation-delay: 4s; }
        .particle:nth-child(4) { width: 100px; height: 100px; bottom: 20%; left: 15%; animation-delay: 1s; }
        .particle:nth-child(5) { width: 90px; height: 90px; top: 70%; right: 25%; animation-delay: 3s; }
        @keyframes float { 0%,100% { transform: translateY(0) rotate(0deg); opacity: 0.3; } 50% { transform: translateY(-40px) rotate(180deg); opacity: 0.6; } }

        .hero-glow { position: absolute; top: 50%; left: 50%; width: 400px; height: 400px; background: radial-gradient(circle, rgba(59,130,246,0.3), transparent); transform: translate(-50%, -50%); filter: blur(60px); animation: pulse 4s infinite; }
        @keyframes pulse { 0%,100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); } 50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); } }

        .nav-bar { display: flex; gap: 12px; margin-bottom: 30px; position: relative; z-index: 10; }
        .nav-btn { display: flex; align-items: center; gap: 8px; padding: 8px 18px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border: 1px solid rgba(255,255,255,0.2); border-radius: 40px; color: white; cursor: pointer; transition: all 0.2s; font-size: 13px; }
        .nav-btn:hover { background: rgba(255,255,255,0.2); transform: translateX(-2px); }
        .nav-btn.home:hover { background: #3b82f6; transform: translateX(0); }

        .hero-content { position: relative; z-index: 10; text-align: center; max-width: 800px; margin: 0 auto; }
        .hero-badge { display: inline-flex; align-items: center; gap: 10px; padding: 6px 20px; background: rgba(255,255,255,0.1); backdrop-filter: blur(10px); border-radius: 40px; color: white; font-size: 11px; margin-bottom: 20px; }
        .hero-content h1 { font-size: 36px; font-weight: 700; color: white; margin-bottom: 12px; }
        .hero-content p { font-size: 15px; color: #94a3b8; margin-bottom: 24px; }
        .hero-stats { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
        .hero-stats .stat { display: flex; align-items: center; gap: 8px; color: #cbd5e1; font-size: 12px; background: rgba(255,255,255,0.05); padding: 6px 16px; border-radius: 40px; }

        .hero-wave { position: absolute; bottom: 0; left: 0; right: 0; height: 50px; }
        .hero-wave svg { width: 100%; height: 100%; fill: #f0f4f8; }

        .org-chart {
          max-width: 1400px;
          margin: -10px auto 0;
          padding: 0 20px 50px;
          position: relative;
          z-index: 3;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .org-level {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 40px;
          flex-wrap: wrap;
          margin: 10px 0;
          width: 100%;
        }

        .org-level.two-cols { gap: 60px; }
        .org-level.four-cols { gap: 25px; }
        .org-level.six-cols { gap: 20px; }

        .org-node-wrapper {
          display: flex;
          justify-content: center;
        }

        .org-connector {
          position: relative;
          width: 100%;
          margin: 5px 0;
        }

        .org-connector.vertical {
          height: 35px;
          display: flex;
          justify-content: center;
        }

        .org-connector.vertical .connector-line {
          width: 2px;
          height: 35px;
          background: linear-gradient(180deg, #94a3b8, #64748b);
        }

        .org-connector.split {
          height: 40px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .org-connector.split .connector-line {
          width: 2px;
          height: 35px;
          background: #94a3b8;
        }

        .org-connector.split .connector-horizontal {
          width: 300px;
          height: 2px;
          background: #94a3b8;
          margin-top: -2px;
        }

        .org-connector.wide {
          height: 45px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .org-connector.wide .connector-line {
          width: 2px;
          height: 40px;
          background: #94a3b8;
        }

        .org-connector.wide .connector-horizontal-wide {
          width: 80%;
          height: 2px;
          background: #94a3b8;
          margin-top: -2px;
        }

        .member-card {
          background: white;
          border-radius: 20px;
          padding: 16px 20px;
          text-align: center;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 4px 12px rgba(0,0,0,0.08);
          border: 1px solid #eef2f6;
          min-width: 180px;
        }

        .member-card:hover {
          transform: translateY(-4px);
          box-shadow: 0 12px 24px rgba(0,0,0,0.12);
        }

        .member-card.vacant { background: #f8fafc; border: 1px dashed #cbd5e1; opacity: 0.7; }
        .vacant-icon { font-size: 28px; color: #94a3b8; margin-bottom: 6px; }

        .card-avatar { width: 60px; height: 60px; margin: 0 auto 10px; }
        .card-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 2px solid #e2e8f0; }
        .avatar-initial { width: 100%; height: 100%; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; font-size: 24px; font-weight: 600; }

        .member-card h3 { font-size: 16px; font-weight: 600; color: #1e293b; margin-bottom: 8px; }
        .member-card .role { font-size: 11px; color: #64748b; margin-bottom: 12px; }

        .card-actions { display: flex; justify-content: center; gap: 8px; }
        .card-actions button { width: 32px; height: 32px; border-radius: 50%; border: none; cursor: pointer; transition: all 0.2s; display: flex; align-items: center; justify-content: center; }
        .wa-btn { background: #dcfce7; color: #22c55e; }
        .wa-btn:hover { background: #22c55e; color: white; transform: scale(1.05); }
        .call-btn { background: #eff6ff; color: #3b82f6; }
        .call-btn:hover { background: #3b82f6; color: white; transform: scale(1.05); }
        .mail-btn { background: #fef3c7; color: #f59e0b; }
        .mail-btn:hover { background: #f59e0b; color: white; transform: scale(1.05); }

        .dept-separator {
          display: flex;
          align-items: center;
          gap: 12px;
          margin: 25px 0 15px;
          width: 100%;
          max-width: 400px;
        }

        .dept-separator .dept-dot { width: 8px; height: 8px; border-radius: 50%; }
        .dept-separator span { font-size: 10px; font-weight: 600; letter-spacing: 1.5px; color: #64748b; }
        .dept-separator .dept-line { flex: 1; height: 1px; background: linear-gradient(90deg, #cbd5e1, transparent); }

        .dept-separator.choir .dept-dot { background: #8b5cf6; }
        .dept-separator.media .dept-dot { background: #f59e0b; }
        .dept-separator.voice .dept-dot { background: #ef4444; }
        .dept-separator.jumuia .dept-dot { background: #10b981; }

        .legend {
          max-width: 600px;
          margin: 20px auto 0;
          padding: 16px 24px;
          background: white;
          border-radius: 20px;
          text-align: center;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .legend-title { font-size: 11px; font-weight: 600; color: #64748b; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 10px; }
        .legend-items { display: flex; justify-content: center; gap: 20px; flex-wrap: wrap; }
        .legend-item { display: flex; align-items: center; gap: 8px; font-size: 11px; color: #475569; }
        .legend-color { width: 10px; height: 10px; border-radius: 3px; }
        .legend-color.leadership { background: #3b82f6; }
        .legend-color.choir { background: #8b5cf6; }
        .legend-color.jumuia { background: #10b981; }
        .legend-color.media { background: #f59e0b; }
        .legend-color.voice { background: #ef4444; }

        .profile-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(8px); z-index: 1000; display: flex; align-items: center; justify-content: center; padding: 20px; }
        .modal-container { background: white; border-radius: 28px; max-width: 500px; width: 100%; max-height: 85vh; overflow-y: auto; position: relative; animation: modalIn 0.3s ease; }
        @keyframes modalIn { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } }
        .modal-close { position: absolute; top: 16px; right: 16px; width: 36px; height: 36px; border-radius: 50%; background: rgba(0,0,0,0.5); border: none; color: white; cursor: pointer; z-index: 10; display: flex; align-items: center; justify-content: center; }
        .modal-close:hover { background: rgba(0,0,0,0.7); transform: rotate(90deg); }
        .modal-header { text-align: center; padding: 40px 24px 32px; color: white; border-radius: 28px 28px 0 0; }
        .modal-avatar-wrapper { position: relative; width: 100px; height: 100px; margin: 0 auto 16px; }
        .modal-avatar { width: 100%; height: 100%; border-radius: 50%; cursor: pointer; position: relative; }
        .modal-avatar img { width: 100%; height: 100%; border-radius: 50%; object-fit: cover; border: 3px solid rgba(255,255,255,0.3); }
        .avatar-zoom { position: absolute; bottom: 0; right: 0; width: 28px; height: 28px; background: rgba(0,0,0,0.6); border-radius: 50%; display: flex; align-items: center; justify-content: center; color: white; opacity: 0; transition: opacity 0.2s; }
        .modal-avatar:hover .avatar-zoom { opacity: 1; }
        .avatar-large { width: 100%; height: 100%; border-radius: 50%; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; font-size: 44px; font-weight: 600; border: 3px solid rgba(255,255,255,0.3); }
        .modal-header h2 { font-size: 22px; margin-bottom: 4px; }
        .modal-role { font-size: 13px; opacity: 0.85; margin-bottom: 10px; }
        .modal-badge { display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.2); padding: 4px 12px; border-radius: 30px; font-size: 10px; }
        .modal-body { padding: 24px; }
        .info-card { background: #f8fafc; border-radius: 18px; padding: 18px; margin-bottom: 18px; }
        .info-card h3 { font-size: 14px; font-weight: 600; margin-bottom: 14px; display: flex; align-items: center; gap: 8px; }
        .info-list { display: flex; flex-direction: column; gap: 12px; }
        .info-item { display: flex; align-items: center; gap: 12px; background: white; padding: 12px 14px; border-radius: 14px; flex-wrap: wrap; }
        .info-content { flex: 1; }
        .info-label { display: block; font-size: 9px; color: #94a3b8; text-transform: uppercase; }
        .info-value { display: block; font-size: 13px; font-weight: 500; color: #1e293b; }
        .info-actions { display: flex; gap: 8px; }
        .info-actions button, .action-mail { padding: 5px 12px; border-radius: 30px; border: none; font-size: 10px; cursor: pointer; display: flex; align-items: center; gap: 5px; }
        .action-call { background: #eff6ff; color: #3b82f6; }
        .action-call:hover { background: #3b82f6; color: white; }
        .action-wa { background: #dcfce7; color: #22c55e; }
        .action-wa:hover { background: #22c55e; color: white; }
        .action-mail { background: #fef3c7; color: #f59e0b; }
        .action-mail:hover { background: #f59e0b; color: white; }
        .details-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; }
        .detail-item { background: white; padding: 12px; border-radius: 14px; text-align: center; display: flex; flex-direction: column; gap: 5px; }
        .detail-item span { font-size: 9px; color: #94a3b8; }
        .detail-item strong { font-size: 12px; color: #1e293b; }
        .status-active { color: #22c55e !important; }
        .quick-actions { display: flex; flex-direction: column; gap: 10px; }
        .quick-action { display: flex; align-items: center; justify-content: center; gap: 10px; padding: 12px; border-radius: 14px; border: none; font-size: 13px; font-weight: 500; cursor: pointer; }
        .quick-action.wa { background: #dcfce7; color: #22c55e; }
        .quick-action.wa:hover { background: #22c55e; color: white; }
        .quick-action.call { background: #eff6ff; color: #3b82f6; }
        .quick-action.call:hover { background: #3b82f6; color: white; }
        .quick-action.email { background: #fef3c7; color: #f59e0b; }
        .quick-action.email:hover { background: #f59e0b; color: white; }

        .full-image-modal { position: fixed; inset: 0; background: rgba(0,0,0,0.95); z-index: 1100; display: flex; align-items: center; justify-content: center; animation: fadeIn 0.3s ease; }
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .full-image-container { position: relative; max-width: 90vw; max-height: 90vh; text-align: center; }
        .full-image-close { position: absolute; top: -45px; right: -45px; width: 40px; height: 40px; border-radius: 50%; background: rgba(255,255,255,0.2); border: none; color: white; cursor: pointer; display: flex; align-items: center; justify-content: center; }
        .full-image-close:hover { background: rgba(255,255,255,0.3); transform: rotate(90deg); }
        .full-image-container img { max-width: 100%; max-height: 75vh; border-radius: 16px; box-shadow: 0 20px 40px rgba(0,0,0,0.3); }
        .full-image-caption { margin-top: 16px; color: white; }
        .full-image-caption h3 { font-size: 18px; margin-bottom: 4px; }
        .full-image-caption p { font-size: 13px; opacity: 0.8; }

        .executive-loader { 
          min-height: 100vh; 
          display: flex; 
          flex-direction: column; 
          align-items: center; 
          justify-content: center; 
          background: linear-gradient(135deg, #0f172a, #1e293b); 
          color: white; 
        }

        .loader-spinner { 
          position: relative; 
          width: 80px; 
          height: 80px; 
          margin-bottom: 24px; 
        }

        .ring { 
          position: absolute; 
          inset: 0; 
          border-radius: 50%; 
          border: 2px solid transparent; 
          animation: spin 1s linear infinite; 
        }

        .ring:nth-child(1) { 
          border-top-color: #3b82f6; 
          border-right-color: #3b82f6; 
        }

        .ring:nth-child(2) { 
          border-bottom-color: #8b5cf6; 
          border-left-color: #8b5cf6; 
          animation-delay: -0.5s;
          width: 60%; 
          height: 60%; 
          top: 20%; 
          left: 20%; 
        }

        .ring:nth-child(3) { 
          border-top-color: #10b981; 
          border-right-color: #10b981; 
          width: 30%; 
          height: 30%; 
          top: 35%; 
          left: 35%; 
          animation-duration: 0.8s;
        }

        @keyframes spin { 
          100% { transform: rotate(360deg); } 
        }

        .loader-crown { 
          position: absolute; 
          top: 50%; 
          left: 50%; 
          transform: translate(-50%, -50%); 
          opacity: 0.9;
          animation: glow 2s ease-in-out infinite;
        }

        @keyframes glow {
          0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
          50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
        }

        .executive-loader h3 { 
          font-size: 20px; 
          margin-bottom: 8px; 
          font-weight: 600;
          background: linear-gradient(135deg, #fff, #94a3b8);
          -webkit-background-clip: text;
          background-clip: text;
          color: transparent;
        }

        .executive-loader p { 
          color: #64748b; 
          font-size: 13px; 
          letter-spacing: 0.5px;
        }

        .executive-loader p::after {
          content: '';
          animation: dots 1.5s steps(4, end) infinite;
        }

        @keyframes dots {
          0%, 20% { content: ''; }
          40% { content: '.'; }
          60% { content: '..'; }
          80%, 100% { content: '...'; }
        }

        /* Tabs */
        .executive-tabs {
          display: flex;
          justify-content: center;
          gap: 16px;
          margin: 20px auto;
          max-width: 400px;
          padding: 0 20px;
        }

        .tab-btn {
          flex: 1;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          padding: 12px 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 60px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
          color: #64748b;
        }

        .tab-btn.active {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          border-color: #3b82f6;
          color: white;
          box-shadow: 0 4px 12px rgba(59,130,246,0.3);
        }

        /* History View */
        .history-view {
          max-width: 800px;
          margin: 20px auto;
          padding: 20px;
        }

        .history-list {
          display: flex;
          flex-direction: column;
          gap: 16px;
        }

        .history-card {
          display: flex;
          align-items: center;
          gap: 16px;
          background: white;
          padding: 16px;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          transition: all 0.2s;
        }

        .history-card:hover {
          transform: translateX(4px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }

        .history-card-avatar {
          width: 60px;
          height: 60px;
          flex-shrink: 0;
        }

        .history-card-avatar img,
        .history-avatar-placeholder {
          width: 100%;
          height: 100%;
          border-radius: 50%;
          object-fit: cover;
        }

        .history-avatar-placeholder {
          background: linear-gradient(135deg, #3b82f6, #2563eb);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 24px;
          font-weight: 600;
        }

        .history-card-info {
          flex: 1;
        }

        .history-card-info h4 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 4px;
        }

        .history-card-info p {
          font-size: 13px;
          color: #64748b;
          margin-bottom: 4px;
        }

        .history-card-info small {
          font-size: 11px;
          color: #94a3b8;
        }

        .history-category-badge {
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 600;
          text-transform: uppercase;
        }

        .history-category-badge.leadership { background: #dbeafe; color: #3b82f6; }
        .history-category-badge.choir { background: #ede9fe; color: #8b5cf6; }
        .history-category-badge.jumuia { background: #d1fae5; color: #10b981; }
        .history-category-badge.media { background: #fed7aa; color: #f59e0b; }
        .history-category-badge.voice { background: #fee2e2; color: #ef4444; }

        .history-loading-state,
        .history-empty-state {
          text-align: center;
          padding: 60px 20px;
          background: white;
          border-radius: 20px;
        }

        .loader-spinner-small {
          width: 40px;
          height: 40px;
          border: 3px solid #e2e8f0;
          border-top-color: #3b82f6;
          border-radius: 50%;
          animation: spin 0.8s linear infinite;
          margin: 0 auto 16px;
        }

        @media (max-width: 768px) {
          .premium-hero { padding: 16px 16px 60px; }
          .hero-content h1 { font-size: 26px; }
          .hero-content p { font-size: 13px; }
          .hero-stats .stat { font-size: 10px; padding: 4px 12px; }
          .nav-btn { padding: 6px 14px; font-size: 12px; }
          
          .org-chart { padding: 0 12px 30px; }
          .org-level { gap: 20px; }
          .org-level.two-cols { gap: 30px; flex-direction: column; align-items: center; }
          .org-level.four-cols { gap: 15px; flex-wrap: wrap; justify-content: center; }
          .org-level.six-cols { gap: 12px; flex-wrap: wrap; justify-content: center; }
          
          .member-card { min-width: 150px; padding: 12px 16px; }
          .card-avatar { width: 50px; height: 50px; }
          .member-card h3 { font-size: 14px; }
          
          .org-connector.split .connector-horizontal { width: 200px; }
          .org-connector.wide .connector-horizontal-wide { width: 90%; }
          
          .dept-separator { margin: 20px 0 10px; }
          .dept-separator span { font-size: 9px; }
          
          .legend { margin-top: 10px; padding: 12px 16px; }
          .legend-items { gap: 12px; }
          
          .modal-container { max-width: 95%; }
          .modal-header h2 { font-size: 20px; }
          .details-grid { grid-template-columns: 1fr; }
          .info-item { flex-direction: column; text-align: center; }
          .info-actions { justify-content: center; }
          .full-image-close { top: -35px; right: -10px; width: 32px; height: 32px; }

          .history-card {
            flex-wrap: wrap;
          }
          
          .history-category-badge {
            margin-left: auto;
          }
        }

        @media (max-width: 480px) {
          .member-card { min-width: 130px; padding: 10px 12px; }
          .card-avatar { width: 45px; height: 45px; }
          .member-card h3 { font-size: 13px; }
          .hero-stats { gap: 10px; }
          .hero-stats .stat { font-size: 9px; padding: 3px 10px; }
        }
      `}</style>
    </div>
  );
}