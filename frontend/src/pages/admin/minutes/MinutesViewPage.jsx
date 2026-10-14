import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Calendar, Clock, MapPin, CheckCircle, XCircle, Download, FileText, File, Loader, ArrowLeft, Printer } from 'lucide-react';
import { api } from "../../../api";
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

export default function MinutesViewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [minutes, setMinutes] = useState(null);
  const [loading, setLoading] = useState(true);
  const [downloading, setDownloading] = useState(false);
  const minutesRef = useRef(null);

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchMinutes();
  }, [id]);

  const fetchMinutes = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/api/minutes/${id}`, { headers });
      setMinutes(response.data.minutes);
    } catch (error) {
      console.error('Error fetching minutes:', error);
    } finally {
      setLoading(false);
    }
  };

  // A helper function to get the rank of a position for sorting purposes
const getPositionRank = (position) => {
  const hierarchy = {
    'Chairperson': 1,
    'Vice Chairperson': 2,
    'Secretary': 3,
    'Vice Secretary': 4,
    'Treasurer': 5,
    'Organising Secretary': 6,
    'Choir Moderator': 7,
    'Vice Choir Moderator': 8,
    'Media Moderator': 9,
    'St. Gregory Moderator': 10,
    'St. Peregrine Moderator': 11,
    'Welfare': 12,
    'ALTO Voice Rep': 13,
    'Member': 99
  };
  return hierarchy[position] || 98;
};

  const getOrdinalSuffix = (day) => {
    if (day > 3 && day < 21) return 'th';
    switch (day % 10) {
      case 1: return 'st';
      case 2: return 'nd';
      case 3: return 'rd';
      default: return 'th';
    }
  };

  const downloadAsPDF = async () => {
    if (downloading || !minutesRef.current) return;
    setDownloading(true);
    try {
      const element = minutesRef.current;
      const canvas = await html2canvas(element, { scale: 2, backgroundColor: '#ffffff', logging: false });
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const imgWidth = 210;
      const imgHeight = (canvas.height * imgWidth) / canvas.width;
      pdf.addImage(imgData, 'PNG', 0, 0, imgWidth, imgHeight);
      pdf.save(`${minutes?.title || 'meeting-minutes'}.pdf`);
    } catch (error) {
      console.error('PDF generation error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const downloadAsWord = () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const meetingDate = new Date(minutes.meetingDate);
      const day = meetingDate.getDate();
      const month = meetingDate.toLocaleString('en-GB', { month: 'long' }).toUpperCase();
      const year = meetingDate.getFullYear();
      const formattedDate = `${day}${getOrdinalSuffix(day)} OF ${month} ${year}`;
      const venue = minutes.venue?.toUpperCase() || 'THE COMPLEX BUILDING';
      const time = minutes.meetingTime || '1850HRS';

      const content = `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="UTF-8">
          <title>${minutes?.title || 'Meeting Minutes'}</title>
          <style>
            @page {
              size: A4;
              margin: 2.5cm;
            }
            body {
              font-family: 'Times New Roman', Times, serif;
              margin: 0;
              padding: 0;
              line-height: 1.5;
              color: #000000;
            }
            .document-container {
              max-width: 100%;
            }
            h1 {
              text-align: center;
              font-size: 16pt;
              font-weight: bold;
              text-transform: uppercase;
              letter-spacing: 1px;
              margin: 0 0 30px 0;
              padding-bottom: 15px;
              border-bottom: 2px solid #000000;
            }
            h2 {
              font-size: 14pt;
              font-weight: bold;
              margin: 25px 0 10px 0;
              text-decoration: underline;
            }
            h3 {
              font-size: 12pt;
              font-weight: bold;
              margin: 15px 0 5px 0;
            }
            .section {
              margin-bottom: 20px;
            }
            .members-list {
              margin: 10px 0;
              padding-left: 20px;
            }
            .member-item {
              font-size: 12pt;
              margin-bottom: 4px;
            }
            .role-tag {
              font-size: 11pt;
              color: #1a56db;
              font-style: italic;
            }
            .section-content {
              font-size: 12pt;
              line-height: 1.5;
              text-align: justify;
              margin: 10px 0;
            }
            .decisions {
              margin: 15px 0 10px 25px;
              padding: 10px 15px;
              background: #f0fdf4;
              border-left: 4px solid #22c55e;
            }
            .decisions strong {
              font-size: 12pt;
              color: #166534;
            }
            .decisions ul {
              margin: 8px 0;
              padding-left: 25px;
            }
            .decisions li {
              font-size: 12pt;
              margin-bottom: 4px;
            }
            .aob-item {
              margin-bottom: 15px;
            }
            .aob-item p {
              margin: 5px 0;
              font-size: 12pt;
            }
            .signatures {
              margin-top: 60px;
              padding-top: 20px;
            }
            .signature-line {
              display: flex;
              align-items: baseline;
              margin-bottom: 25px;
            }
            .signature-label {
              font-size: 12pt;
              font-weight: bold;
              width: 110px;
            }
            .signature-placeholder {
              flex: 1;
              font-size: 12pt;
              border-bottom: 1px solid #000000;
              margin-left: 15px;
              padding: 0 10px;
            }
            .footer {
              text-align: center;
              margin-top: 50px;
              padding-top: 20px;
              border-top: 1px solid #cccccc;
              font-size: 10pt;
              color: #666666;
            }
            .underline {
              text-decoration: underline;
            }
            .bold {
              font-weight: bold;
            }
            .text-center {
              text-align: center;
            }
            @media print {
              body {
                margin: 0;
                padding: 0;
              }
              .no-print {
                display: none;
              }
            }
          </style>
        </head>
       <body>
  <div class="document-container">
    <h1>MINUTES OF MEETING HELD ON ${formattedDate}<br/>AT ${venue} AT ${time}</h1>
    
    <h2>Members present</h2>
    <div class="members-list">
      ${(() => {
        const getPositionRank = (position) => {
          const hierarchy = {
            'Chairperson': 1,
            'Vice Chairperson': 2,
            'Secretary': 3,
            'Vice Secretary': 4,
            'Treasurer': 5,
            'Organising Secretary': 6,
            'Choir Moderator': 7,
            'Vice Choir Moderator': 8,
            'Media Moderator': 9,
            'St. Gregory Moderator': 10,
            'St. Peregrine Moderator': 11,
            'Welfare': 12,
            'ALTO Voice Rep': 13,
            'Member': 99
          };
          return hierarchy[position] || 98;
        };

        const executives = (minutes?.presentMembers || []).filter(m => 
          m.executivePosition && m.executivePosition !== 'Member'
        );
        
        const sortedExecutives = [...executives].sort((a, b) => {
          const roleA = a.executivePosition || 'Member';
          const roleB = b.executivePosition || 'Member';
          return getPositionRank(roleA) - getPositionRank(roleB);
        });

        return sortedExecutives.map((member, idx) => {
          let displayRole = member.executivePosition || 'Member';
          return `<div class="member-item">${idx + 1}. ${member.fullName} <span class="role-tag">(${displayRole})</span></div>`;
        }).join('');
      })()}
    </div>

    ${(() => {
      const regularMembers = (minutes?.presentMembers || []).filter(m => 
        !m.executivePosition || m.executivePosition === 'Member'
      );
      const guests = minutes?.presentGuests || [];
      const inAttendance = [...regularMembers, ...guests];
      
      if (inAttendance.length === 0) return '';
      
      return `
        <h2>In-Attendance</h2>
        <div class="members-list">
          ${inAttendance.map((member, idx) => {
            let displayName = member.fullName;
            let displayRole = member.role || 'Member';
            if (member.role === 'Guest' || member.role === 'guest') {
              displayRole = '';
            }
            return `<div class="member-item">${idx + 1}. ${displayName}${displayRole ? ` (${displayRole})` : ''}</div>`;
          }).join('')}
        </div>
      `;
    })()}
    
    ${minutes?.absentMembers?.length > 0 ? `
      <h2>Absent Members</h2>
      <div class="members-list">
        ${minutes.absentMembers.map((member, idx) => {
          let displayRole = member.executivePosition || null;
          return `<div class="member-item">${idx + 1}. ${member.fullName}${displayRole ? ` <span class="role-tag">(${displayRole})</span>` : ''}${member.excused ? ` <span class="excused-tag">(Excused)</span>` : ''}</div>`;
        }).join('')}
      </div>` : ''}

    ${minutes?.absentMembers?.filter(m => m.excused).length > 0 ? `
      <h2>Absent with Apology</h2>
      <div class="members-list">
        ${minutes.absentMembers.filter(m => m.excused).map((member, idx) => `<div class="member-item">${idx + 1}. ${member.fullName}</div>`).join('')}
      </div>` : ''}
    
    <h2>Agenda</h2>
    <div class="members-list">
      ${minutes?.agenda?.map((item, idx) => `<div class="member-item">${idx + 1}. ${item}</div>`).join('') || '<div class="member-item">None</div>'}
    </div>
    
    ${minutes?.preliminaries ? `
      <h2>MIN 01/${String(new Date().getMonth() + 1).padStart(2, '0')}: PRELIMINARIES</h2>
      <p class="section-content">${minutes.preliminaries}</p>` : ''}
    
    ${minutes?.sections?.map(section => `
      <h2>${section.number}: ${section.title}</h2>
      <p class="section-content">${section.content}</p>
      ${section.decisions?.length > 0 ? `
        <div class="decisions">
          <strong>DECISIONS:</strong>
          <ul>
            ${section.decisions.map(d => `<li>${d}</li>`).join('')}
          </ul>
        </div>` : ''}
    `).join('')}
    
    ${minutes?.aob?.length > 0 ? `
      <h2>MIN ${String((minutes.sections?.length || 0) + 2).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}: AOB</h2>
      ${minutes.aob.map(item => `<div class="aob-item"><p><strong>${item.title}</strong></p>${item.content ? `<p>${item.content}</p>` : ''}</div>`).join('')}` : ''}

    ${minutes?.adjournment ? `
      <h2>MIN ${String((minutes.sections?.length || 0) + (minutes.aob?.length > 0 ? 3 : 2)).padStart(2, '0')}/${String(new Date().getMonth() + 1).padStart(2, '0')}: ADJOURNMENT</h2>
      <p class="section-content">${minutes.adjournment}</p>` : ''}
    
    <div class="signatures">
      <div class="signature-line">
        <div class="signature-label">Date</div>
        <div class="signature-placeholder">_________________</div>
      </div>
      <div class="signature-line">
        <div class="signature-label">Chairperson</div>
        <div class="signature-placeholder">........................................</div>
      </div>
      <div class="signature-line">
        <div class="signature-label">Secretary</div>
        <div class="signature-placeholder">........................................</div>
      </div>
    </div>
    
    <div class="footer">
      <p>ZUCA PORTAL SYSTEM GENERATED DOCUMENT</p>
    </div>
  </div>
</body>
        </html>
      `;
      const blob = new Blob([content], { type: 'application/msword' });
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = `${minutes?.title?.replace(/\s/g, '_') || 'meeting-minutes'}.doc`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (error) {
      console.error('Word generation error:', error);
    } finally {
      setDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  if (loading) {
    return (
      <div className="minutes-view-page">
        <div className="loading-container">
          <Loader size={48} className="spin" />
          <p>Loading minutes...</p>
        </div>
      </div>
    );
  }

  if (!minutes) {
    return (
      <div className="minutes-view-page">
        <div className="error-container">
          <p>Minutes not found</p>
          <button onClick={() => navigate(-1)} className="back-btn">Back to Minutes</button>
        </div>
      </div>
    );
  }

  const meetingDate = new Date(minutes.meetingDate);
  const day = meetingDate.getDate();
  const month = meetingDate.toLocaleString('en-GB', { month: 'long' }).toUpperCase();
  const year = meetingDate.getFullYear();
  const formattedDate = `${day}${getOrdinalSuffix(day)} OF ${month} ${year}`;
  const venue = minutes.venue?.toUpperCase() || 'THE COMPLEX BUILDING';
  const time = minutes.meetingTime || '1850HRS';

  return (
    <div className="minutes-view-page">
      <div className="action-bar no-print">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={18} /> Back to Minutes
        </button>
        <div className="action-buttons">
          <button className="action-btn print" onClick={handlePrint}>
            <Printer size={18} /> Print
          </button>
          <button className="action-btn pdf" onClick={downloadAsPDF} disabled={downloading}>
            {downloading ? <Loader size={18} className="spin" /> : <FileText size={18} />}
            PDF
          </button>
          <button className="action-btn word" onClick={downloadAsWord} disabled={downloading}>
            <File size={18} /> Word
          </button>
        </div>
      </div>

      <div className="official-document" ref={minutesRef}>
        <h1>MINUTES OF MEETING HELD ON {formattedDate}<br/>AT {venue} AT {time}</h1>
        
       
       <h2>Members present</h2>
<div className="members-list">
  {(() => {
    const getPositionRank = (position) => {
      const hierarchy = {
        'Chairperson': 1,
        'Vice Chairperson': 2,
        'Secretary': 3,
        'Vice Secretary': 4,
        'Treasurer': 5,
        'Organising Secretary': 6,
        'Choir Moderator': 7,
        'Vice Choir Moderator': 8,
        'Media Moderator': 9,
        'St. Gregory Moderator': 10,
        'St. Peregrine Moderator': 11,
        'Welfare': 12,
        'ALTO Voice Rep': 13,
        'Member': 99
      };
      return hierarchy[position] || 98;
    };

    const executives = (minutes.presentMembers || []).filter(m => 
      m.executivePosition && m.executivePosition !== 'Member'
    );
    
    const sortedExecutives = [...executives].sort((a, b) => {
      const roleA = a.executivePosition || 'Member';
      const roleB = b.executivePosition || 'Member';
      return getPositionRank(roleA) - getPositionRank(roleB);
    });

    return sortedExecutives.map((member, idx) => {
      let displayRole = member.executivePosition || 'Member';
      return (
        <div key={member.userId || idx} className="member-item">
          {idx + 1}. {member.fullName}
          <span className="role-tag"> ({displayRole})</span>
        </div>
      );
    });
  })()}
</div>

{(() => {
  const regularMembers = (minutes.presentMembers || []).filter(m => 
    !m.executivePosition || m.executivePosition === 'Member'
  );
  const guests = minutes.presentGuests || [];
  const inAttendance = [...regularMembers, ...guests];
  
  if (inAttendance.length === 0) return null;
  
  return (
    <>
      <h2>In-Attendance</h2>
      <div className="members-list">
        {inAttendance.map((member, idx) => {
          let displayName = member.fullName;
          let displayRole = member.role || 'Member';
          if (member.role === 'Guest' || member.role === 'guest') {
            displayRole = '';
          }
          return (
            <div key={member.userId || idx} className="member-item">
              {idx + 1}. {displayName}{displayRole ? ` (${displayRole})` : ''}
            </div>
          );
        })}
      </div>
    </>
  );
})()}

 {/* All Absent Members */}
{minutes.absentMembers?.length > 0 && (
  <>
    <h2>Absent Members</h2>
    <div className="members-list">
      {minutes.absentMembers.map((member, idx) => {
        // ONLY show executivePosition, never role or specialRole
        let displayRole = member.executivePosition || null;
        
        return (
          <div key={idx} className="member-item">
            {idx + 1}. {member.fullName}
            {displayRole && <span className="role-tag"> ({displayRole})</span>}
            {member.excused && <span className="excused-tag"> (Excused)</span>}
          </div>
        );
      })}
    </div>
  </>
)}

{/* Only Absent with Apology (if you want separate section) */}
{minutes.absentMembers?.filter(m => m.excused).length > 0 && (
  <>
    <h2>Absent with Apology</h2>
    <div className="members-list">
      {minutes.absentMembers.filter(m => m.excused).map((member, idx) => (
        <div key={idx} className="member-item">{idx + 1}. {member.fullName}</div>
      ))}
    </div>
  </>
)}

        {minutes.presentGuests?.length > 0 && (
          <>
            
          </>
        )}

        <h2>Agenda</h2>
        <div className="members-list">
          {minutes.agenda?.map((item, idx) => (
            <div key={idx} className="member-item">{idx + 1}. {item}</div>
          ))}
        </div>

        {minutes.preliminaries && (
  <>
    <h2>MIN 01/{String(new Date().getMonth() + 1).padStart(2, '0')}: PRELIMINARIES</h2>
    <p className="section-content">{minutes.preliminaries}</p>
  </>
)}

        {minutes.sections?.map((section, idx) => (
          <div key={idx}>
            <h2>{section.number}: {section.title}</h2>
            <p className="section-content">{section.content}</p>
            {section.decisions?.length > 0 && (
              <div className="decisions">
                <strong>DECISIONS:</strong>
                <ul>
                  {section.decisions.map((d, i) => <li key={i}>{d}</li>)}
                </ul>
              </div>
            )}
          </div>
        ))}

      {minutes.aob?.length > 0 && (
  <>
    <h2>MIN {String((minutes.sections?.length || 0) + 2).padStart(2, '0')}/{String(new Date().getMonth() + 1).padStart(2, '0')}: AOB</h2>
    {minutes.aob.map((item, idx) => (
      <div key={idx} className="aob-item">
        <p><strong>{item.title}</strong></p>
        {item.content && <p>{item.content}</p>}
      </div>
    ))}
  </>
)}

{minutes.adjournment && (
  <>
    <h2>MIN {String((minutes.sections?.length || 0) + (minutes.aob?.length > 0 ? 3 : 2)).padStart(2, '0')}/{String(new Date().getMonth() + 1).padStart(2, '0')}: ADJOURNMENT</h2>
    <p className="section-content">{minutes.adjournment}</p>
  </>
)}

        <div className="signatures">
          <div className="signature-line">
            <div className="signature-label">Date</div>
            <div className="signature-placeholder">_________________</div>
          </div>
          <div className="signature-line">
            <div className="signature-label">Chairperson</div>
            <div className="signature-placeholder">{'........................................'}</div>
          </div>
          <div className="signature-line">
            <div className="signature-label">Secretary</div>
            <div className="signature-placeholder">{'........................................'}</div>
          </div>
        </div>

        <div className="footer">
          <p>ZUCA PORTAL SYSTEM GENERATED DOCUMENT</p>
        </div>
      </div>

      <style>{`
        .minutes-view-page {
          max-width: 1100px;
          margin: 0 auto;
          padding: 24px;
          background: #f8fafc;
          min-height: 100vh;
        }

        .action-bar {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
          background: white;
          padding: 16px 24px;
          border-radius: 16px;
          border: 1px solid #e2e8f0;
        }

        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #f1f5f9;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
        }

        .action-buttons {
          display: flex;
          gap: 12px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .action-btn.print { background: #e2e8f0; color: #1e293b; }
        .action-btn.pdf { background: #ef4444; color: white; }
        .action-btn.word { background: #3b82f6; color: white; }
        .action-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        .official-document {
          background: white;
          border-radius: 20px;
          padding: 50px 45px;
          box-shadow: 0 20px 35px -10px rgba(0,0,0,0.1);
          border: 1px solid #e2e8f0;
        }

        h1 {
          text-align: center;
          font-size: 16px;
          font-weight: 700;
          text-transform: uppercase;
          margin: 0 0 30px 0;
          padding-bottom: 15px;
          border-bottom: 2px solid #1a1a1a;
          letter-spacing: 0.5px;
        }

        h2 {
          font-size: 14px;
          font-weight: 700;
          margin: 25px 0 12px 0;
          text-decoration: underline;
        }

        .members-list {
          margin: 10px 0;
          padding-left: 20px;
        }

        .member-item {
          font-size: 13px;
          margin-bottom: 4px;
          line-height: 1.5;
        }

        .role-tag {
          font-size: 11px;
          color: #3b82f6;
        }

        .section-content {
          font-size: 13px;
          line-height: 1.6;
          text-align: justify;
          margin: 10px 0;
        }

        .decisions {
          margin: 15px 0 10px 25px;
          padding: 12px 16px;
          background: #f0fdf4;
          border-left: 4px solid #22c55e;
          border-radius: 8px;
        }

        .decisions strong {
          font-size: 12px;
          color: #166534;
        }

        .decisions ul {
          margin: 8px 0;
          padding-left: 25px;
        }

        .decisions li {
          font-size: 12px;
          margin-bottom: 4px;
        }

        .aob-item {
          margin-bottom: 15px;
        }

        .aob-item p {
          margin: 5px 0;
          font-size: 13px;
        }

        .aob-item strong {
          font-size: 13px;
        }

        .signatures {
          margin-top: 60px;
          padding-top: 20px;
        }

        .signature-line {
          display: flex;
          align-items: baseline;
          margin-bottom: 25px;
        }

        .signature-label {
          font-size: 13px;
          font-weight: 700;
          width: 110px;
        }

        .signature-placeholder {
          flex: 1;
          font-size: 13px;
          border-bottom: 1px solid #000000;
          margin-left: 15px;
          padding: 0 10px;
          letter-spacing: 2px;
        }

        .footer {
          text-align: center;
          margin-top: 50px;
          padding-top: 20px;
          border-top: 1px solid #e2e8f0;
          font-size: 10px;
          color: #94a3b8;
        }

        .loading-container, .error-container {
          text-align: center;
          padding: 80px;
          background: white;
          border-radius: 20px;
        }

        .spin {
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          to { transform: rotate(360deg); }
        }

        @media print {
          .no-print {
            display: none !important;
          }
          .minutes-view-page {
            padding: 0;
            background: white;
          }
          .official-document {
            padding: 20px;
            box-shadow: none;
            border: none;
          }
          h1 {
            font-size: 14pt;
          }
          h2 {
            font-size: 12pt;
          }
          .member-item, .section-content, .decisions li, .aob-item p {
            font-size: 11pt;
          }
        }

        @media (max-width: 768px) {
          .minutes-view-page { padding: 16px; }
          .official-document { padding: 25px 20px; }
          .action-bar { flex-direction: column; align-items: stretch; }
          .action-buttons { justify-content: center; }
          .signature-line { flex-direction: column; gap: 8px; }
          .signature-placeholder { width: 100%; margin-left: 0; margin-top: 5px; }
        }

        .excused-tag {
  font-size: 11px;
  color: #f59e0b;
  font-style: italic;
  margin-left: 5px;
}
      `}</style>
    </div>
  );
}