import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Trash2, Calendar, Clock, MapPin, ChevronDown, ArrowLeft, Save, Loader } from 'lucide-react';
import { api } from '../../../api';

export default function MinutesEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const [formData, setFormData] = useState({
    agenda: [],
    preliminaries: '',
    sections: [],
    aob: [],
    adjournment: ''
  });

  const token = localStorage.getItem('token');
  const headers = { Authorization: `Bearer ${token}` };

  useEffect(() => {
    fetchMinutes();
  }, [id]);

  const fetchMinutes = async () => {
  setLoading(true);
  try {
    const response = await api.get(`/api/minutes/${id}`, { headers });
    const minutes = response.data.minutes;
    
    // Convert any year-based section numbers to month format
    const currentMonth = new Date().getMonth() + 1;
    const monthFormatted = String(currentMonth).padStart(2, '0');
    const updatedSections = (minutes.sections || []).map((section, idx) => {
      // If section number has /25, /26 (year), replace with current month
      if (section.number && section.number.match(/\/(\d{2})$/)) {
        // Extract original section number to preserve it
const originalNumberMatch = section.number.match(/MIN (\d+)/);
const originalNumber = originalNumberMatch ? originalNumberMatch[1] : String(idx + 1).padStart(2, '0');
const newNumber = `MIN ${originalNumber}/${monthFormatted}`;
        return { ...section, number: newNumber };
      }
      return section;
    });
    
    setFormData({
      agenda: minutes.agenda || [''],
      preliminaries: minutes.preliminaries || '',
      sections: updatedSections.length ? updatedSections : [{ number: `MIN 01/${monthFormatted}`, title: '', content: '', decisions: [''] }],
      aob: minutes.aob || [{ title: '', content: '' }],
      adjournment: minutes.adjournment || ''
    });
  } catch (error) {
    console.error('Error fetching minutes:', error);
  } finally {
    setLoading(false);
  }
};
const addSection = () => {
  const currentMonth = new Date().getMonth() + 1;
  const monthFormatted = String(currentMonth).padStart(2, '0');
  // Start from 2 because MIN 01 is PRELIMINARIES
  const nextNumber = formData.sections.length + 2;
  const newNumber = `MIN ${String(nextNumber).padStart(2, '0')}/${monthFormatted}`;
  setFormData(prev => ({
    ...prev,
    sections: [...prev.sections, { number: newNumber, title: '', content: '', decisions: [''] }]
  }));
  setExpandedSections(prev => ({ ...prev, [formData.sections.length]: true }));
};
  const removeSection = (index) => {
    setFormData(prev => ({ ...prev, sections: prev.sections.filter((_, i) => i !== index) }));
  };

  const updateSection = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === index ? { ...s, [field]: value } : s)
    }));
  };

  const addDecision = (sectionIndex) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === sectionIndex ? { ...s, decisions: [...s.decisions, ''] } : s)
    }));
  };

  const updateDecision = (sectionIndex, decisionIndex, value) => {
    setFormData(prev => ({
      ...prev,
      sections: prev.sections.map((s, i) => i === sectionIndex ? {
        ...s,
        decisions: s.decisions.map((d, j) => j === decisionIndex ? value : d)
      } : s)
    }));
  };

  const addAgenda = () => {
    setFormData(prev => ({ ...prev, agenda: [...prev.agenda, ''] }));
  };

  const updateAgenda = (index, value) => {
    setFormData(prev => ({ ...prev, agenda: prev.agenda.map((a, i) => i === index ? value : a) }));
  };

  const addAOB = () => {
    setFormData(prev => ({ ...prev, aob: [...prev.aob, { title: '', content: '' }] }));
  };

  const updateAOB = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      aob: prev.aob.map((a, i) => i === index ? { ...a, [field]: value } : a)
    }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    try {
      const submitData = {
        agenda: formData.agenda.filter(a => a.trim()),
        preliminaries: formData.preliminaries,
        sections: formData.sections.filter(s => s.title.trim()).map(s => ({
          number: s.number,
          title: s.title,
          content: s.content,
          decisions: s.decisions.filter(d => d.trim())
        })),
        aob: formData.aob.filter(a => a.title.trim() || a.content.trim()),
        adjournment: formData.adjournment
      };

      await api.put(`/api/minutes/${id}`, submitData, { headers });
      navigate('/admin/minutes');
    } catch (error) {
      console.error('Error updating minutes:', error);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="edit-minutes-page">
        <div className="loading-container">
          <Loader size={48} className="spin" />
          <p>Loading minutes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="edit-minutes-page">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
  <ArrowLeft size={18} /> Back to Minutes
</button>
        <h1>Edit Meeting Minutes</h1>
        <button className="submit-btn" onClick={handleSubmit} disabled={saving}>
          {saving ? <><Loader size={16} className="spin" /> Saving...</> : <><Save size={16} /> Save Changes</>}
        </button>
      </div>

      {saving && (
        <div className="loading-overlay">
          <div className="loading-popup">
            <Loader size={40} className="spin" />
            <p>Saving minutes...</p>
          </div>
        </div>
      )}

      <div className="form-section">
        <label>Agenda Items</label>
        {formData.agenda.map((item, idx) => (
          <div key={idx} className="array-item">
            <input type="text" value={item} onChange={(e) => updateAgenda(idx, e.target.value)} placeholder={`Item ${idx + 1}`} />
            {idx === formData.agenda.length - 1 && (
              <button type="button" className="add-btn" onClick={addAgenda}><Plus size={16} /></button>
            )}
          </div>
        ))}
      </div>

      <div className="form-section">
        <label>Preliminaries</label>
        <textarea value={formData.preliminaries} onChange={(e) => setFormData(prev => ({ ...prev, preliminaries: e.target.value }))} rows="3" />
      </div>

      <div className="form-section">
        <div className="section-header-label">
          <label>Minutes Sections</label>
          <button type="button" className="add-section-btn" onClick={addSection}><Plus size={16} /> Add Section</button>
        </div>
        
        {formData.sections.map((section, idx) => (
          <div key={idx} className="section-card">
            <div className="section-header" onClick={() => setExpandedSections(prev => ({ ...prev, [idx]: !prev[idx] }))}>
              <span>{section.number}</span>
              <div className="section-actions">
                <button type="button" className="remove-btn" onClick={(e) => { e.stopPropagation(); removeSection(idx); }}><Trash2 size={14} /></button>
                <ChevronDown size={16} className={expandedSections[idx] ? 'rotate' : ''} />
              </div>
            </div>
            {expandedSections[idx] && (
              <div className="section-content">
                <input type="text" placeholder="Section Title" value={section.title} onChange={(e) => updateSection(idx, 'title', e.target.value)} />
                <textarea placeholder="Discussion content" value={section.content} onChange={(e) => updateSection(idx, 'content', e.target.value)} rows="4" />
                <div className="sub-section">
                  <label>Decisions Made</label>
                  {section.decisions.map((decision, dIdx) => (
                    <div key={dIdx} className="array-item">
                      <input type="text" value={decision} onChange={(e) => updateDecision(idx, dIdx, e.target.value)} placeholder={`Decision ${dIdx + 1}`} />
                      {dIdx === section.decisions.length - 1 && (
                        <button type="button" className="add-btn" onClick={() => addDecision(idx)}><Plus size={14} /></button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="form-section">
        <div className="section-header-label">
          <label>AOB</label>
          <button type="button" className="add-section-btn" onClick={addAOB}><Plus size={16} /> Add AOB</button>
        </div>
        {formData.aob.map((item, idx) => (
          <div key={idx} className="aob-card">
            <input type="text" placeholder="Topic" value={item.title} onChange={(e) => updateAOB(idx, 'title', e.target.value)} />
            <textarea placeholder="Details" value={item.content} onChange={(e) => updateAOB(idx, 'content', e.target.value)} rows="2" />
            {formData.aob.length > 1 && (
              <button type="button" className="remove-aob" onClick={() => setFormData(prev => ({ ...prev, aob: prev.aob.filter((_, i) => i !== idx) }))}>
                <Trash2 size={14} />
              </button>
            )}
          </div>
        ))}
      </div>

      <div className="form-section">
        <label>Adjournment</label>
        <textarea value={formData.adjournment} onChange={(e) => setFormData(prev => ({ ...prev, adjournment: e.target.value }))} rows="2" />
      </div>

      <div className="form-actions">
        <button className="cancel-btn" onClick={() => navigate('/admin/minutes')}>Cancel</button>
        <button className="submit-btn" onClick={handleSubmit} disabled={saving}>
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <style>{`
        .edit-minutes-page {
          max-width: 900px;
          margin: 0 auto;
          padding: 24px;
          background: #f8fafc;
          min-height: 100vh;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          color: #1e293b;
        }
        .page-header h1 {
          margin: 0;
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
        }
        .submit-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          background: #1a1a1a;
          color: white;
        }
        .form-section {
          background: white;
          border-radius: 16px;
          padding: 20px;
          margin-bottom: 20px;
          border: 1px solid #e2e8f0;
        }
        .form-section label {
          display: block;
          font-weight: 600;
          margin-bottom: 12px;
          font-size: 14px;
          color: #0f172a;
        }
        .form-section input, .form-section textarea {
          width: 100%;
          padding: 12px;
          border: 1px solid #e2e8f0;
          border-radius: 10px;
          font-size: 14px;
          font-family: inherit;
        }
        .array-item {
          display: flex;
          gap: 10px;
          margin-bottom: 10px;
        }
        .array-item input { flex: 1; }
        .add-btn {
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          padding: 0 16px;
        }
        .section-header-label {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 16px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .add-section-btn {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: #f1f5f9;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-size: 12px;
        }
        .section-card {
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          margin-bottom: 16px;
          overflow: hidden;
        }
        .section-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 14px 16px;
          background: #f8fafc;
          cursor: pointer;
          font-weight: 500;
        }
        .remove-btn {
          background: none;
          border: none;
          cursor: pointer;
          color: #ef4444;
        }
        .rotate { transform: rotate(180deg); }
        .section-content { padding: 16px; border-top: 1px solid #e2e8f0; }
        .sub-section {
          margin-top: 16px;
          padding-top: 12px;
          border-top: 1px dashed #e2e8f0;
        }
        .aob-card {
          position: relative;
          padding: 16px;
          background: #f8fafc;
          border-radius: 12px;
          margin-bottom: 12px;
        }
        .remove-aob {
          position: absolute;
          top: 12px;
          right: 12px;
          background: none;
          border: none;
          cursor: pointer;
          color: #ef4444;
        }
        .form-actions {
          display: flex;
          justify-content: flex-end;
          gap: 16px;
          margin-top: 24px;
        }
        .cancel-btn {
          padding: 12px 24px;
          background: #f1f5f9;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }
        .loading-container, .loading-overlay {
          text-align: center;
          padding: 80px;
          background: white;
          border-radius: 20px;
        }
        .loading-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          backdrop-filter: blur(4px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 0;
        }
        .loading-popup {
          background: white;
          border-radius: 20px;
          padding: 30px 40px;
          text-align: center;
        }
        .spin { animation: spin 1s linear infinite; }
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 768px) {
          .edit-minutes-page { padding: 16px; }
          .page-header { flex-direction: column; align-items: stretch; }
          .form-actions { flex-direction: column; }
          .cancel-btn, .submit-btn { width: 100%; justify-content: center; }
        }
      `}</style>
    </div>
  );
}