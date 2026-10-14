import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, Calendar, Book, ChevronLeft, ChevronRight,
  Church, Share2, Download, Printer, Heart, BookOpen,
  Sun, Moon, Cloud, Star, Sparkles, Leaf, X, ChevronDown
} from 'lucide-react';
import { publicApi } from '../api';
import logo from '../assets/zuca-logo.png';
import html2canvas from 'html2canvas';

const FullReadings = () => {
  const { date } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [readingData, setReadingData] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);
  const [showDownloadOptions, setShowDownloadOptions] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  const cleanText = (text) => {
    if (!text) return '';
    
    return text
      .replace(/[<>?\/"]/g, ' ')
      .replace(/matthew\/\d+\??\d*"?/gi, ' ')
      .replace(/LISTEN PODCAST.*?(?=\n|$)/gi, '')
      .replace(/VIEW REFLECTION VIDEO.*?(?=\n|$)/gi, '')
      .replace(/En Español.*?(?=\n|$)/gi, '')
      .replace(/View Calendar.*?(?=\n|$)/gi, '')
      .replace(/Get Daily Readings E-mails.*?(?=\n|$)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  };

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    fetchFullReadings();
  }, [date]);

  const fetchFullReadings = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const [year, month, day] = date.split('-');
      const response = await publicApi.get(`/api/calendar/readings/${year}/${month}/${day}`);
      setReadingData(response.data);
    } catch (err) {
      console.error('Error fetching readings:', err);
      setError('Failed to load readings for this date');
    } finally {
      setLoading(false);
    }
  };

  const goToPreviousDay = () => {
    const current = new Date(date);
    current.setDate(current.getDate() - 1);
    const newDate = current.toISOString().split('T')[0];
    navigate(`/readings/${newDate}`);
  };

  const goToNextDay = () => {
    const current = new Date(date);
    current.setDate(current.getDate() + 1);
    const newDate = current.toISOString().split('T')[0];
    navigate(`/readings/${newDate}`);
  };

  const goToCalendar = () => {
    const [year, month] = date.split('-');
    navigate(`/liturgical-calendar?year=${year}&month=${month}`);
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const weekdays = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    
    const weekday = weekdays[date.getDay()];
    const month = months[date.getMonth()];
    const day = date.getDate();
    const year = date.getFullYear();
    
    return `${weekday}, ${month} ${day}, ${year}`;
  };

  const getSeasonColor = (season) => {
    const colors = {
      advent: '#800080',
      christmas: '#FFD700',
      lent: '#800080',
      easter: '#FFD700',
      ordinary: '#008000'
    };
    return colors[season] || '#008000';
  };

  const getSeasonBg = (season) => {
    const backgrounds = {
      advent: 'rgba(128, 0, 128, 0.08)',
      christmas: 'rgba(255, 215, 0, 0.08)',
      lent: 'rgba(128, 0, 128, 0.08)',
      easter: 'rgba(255, 215, 0, 0.08)',
      ordinary: 'rgba(0, 128, 0, 0.08)'
    };
    return backgrounds[season] || 'rgba(0,0,0,0.05)';
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${readingData.celebration} - Daily Readings`,
          text: `Readings for ${formatDate(date)}: ${readingData.readings?.firstReading?.citation} | ${readingData.readings?.gospel?.citation}`,
          url: window.location.href,
        });
      } catch (err) {
        console.log('Share cancelled');
      }
    } else {
      setShowShareModal(true);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownloadImage = async () => {
    try {
      const contentElement = document.createElement('div');
      contentElement.style.padding = '40px';
      contentElement.style.background = 'white';
      contentElement.style.color = 'black';
      contentElement.style.maxWidth = '800px';
      contentElement.style.fontFamily = 'Arial, sans-serif';
      contentElement.style.borderRadius = '12px';
      contentElement.style.boxShadow = '0 4px 12px rgba(0,0,0,0.1)';
      
      let contentHTML = `
        <div style="text-align: center; margin-bottom: 30px;">
          <h1 style="color: #800080; margin: 0; font-size: 28px;">${readingData.celebration}</h1>
          <p style="color: #666; font-size: 18px; margin: 10px 0;">${formatDate(date)}</p>
          <p style="color: #00c6ff; font-size: 16px; margin: 5px 0;">Liturgical Year: ${readingData.yearCycle || 'Unknown'}</p>
        </div>
      `;
      
      if (readingData.readings?.firstReading) {
        contentHTML += `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #800080; border-bottom: 3px solid #00c6ff; padding-bottom: 8px; font-size: 22px;">
              First Reading <span style="color: #00c6ff; font-size: 16px; margin-left: 10px;">${readingData.readings.firstReading.citation}</span>
            </h2>
            <div style="line-height: 1.8; color: #333; font-size: 16px;">
              ${cleanText(readingData.readings.firstReading.text).replace(/\n/g, '<br>')}
            </div>
          </div>
        `;
      }
      
      if (readingData.readings?.responsorialPsalm) {
        contentHTML += `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #800080; border-bottom: 3px solid #00c6ff; padding-bottom: 8px; font-size: 22px;">
              Psalm <span style="color: #00c6ff; font-size: 16px; margin-left: 10px;">${readingData.readings.responsorialPsalm.citation}</span>
            </h2>
            ${readingData.readings.responsorialPsalm.response ? 
              `<p style="color: #800080; font-style: italic; font-size: 17px; margin-bottom: 15px;"><strong>R. ${readingData.readings.responsorialPsalm.response}</strong></p>` : ''}
            <div style="line-height: 1.8; color: #333; font-size: 16px;">
              ${cleanText(readingData.readings.responsorialPsalm.text).replace(/\n/g, '<br>')}
            </div>
          </div>
        `;
      }
      
      if (readingData.readings?.secondReading) {
        contentHTML += `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #800080; border-bottom: 3px solid #00c6ff; padding-bottom: 8px; font-size: 22px;">
              Second Reading <span style="color: #00c6ff; font-size: 16px; margin-left: 10px;">${readingData.readings.secondReading.citation}</span>
            </h2>
            <div style="line-height: 1.8; color: #333; font-size: 16px;">
              ${cleanText(readingData.readings.secondReading.text).replace(/\n/g, '<br>')}
            </div>
          </div>
        `;
      }
      
      if (readingData.readings?.gospel) {
        contentHTML += `
          <div style="margin-bottom: 30px;">
            <h2 style="color: #b8860b; border-bottom: 3px solid #FFD700; padding-bottom: 8px; font-size: 22px;">
              Gospel <span style="color: #00c6ff; font-size: 16px; margin-left: 10px;">${readingData.readings.gospel.citation}</span>
            </h2>
            <div style="line-height: 1.8; color: #333; font-size: 16px; font-weight: 500;">
              ${cleanText(readingData.readings.gospel.text).replace(/\n/g, '<br>')}
            </div>
          </div>
        `;
      }
      
      contentHTML += `
        <div style="text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; color: #999; font-size: 12px;">
          <p>Readings Generated by • Zetech Catholic Action Portal</p>
        </div>
      `;
      
      contentElement.innerHTML = contentHTML;
      
      contentElement.style.position = 'absolute';
      contentElement.style.left = '-9999px';
      contentElement.style.top = '-9999px';
      document.body.appendChild(contentElement);
      
      const canvas = await html2canvas(contentElement, {
        scale: 2,
        backgroundColor: '#ffffff',
        logging: false,
        allowTaint: false,
        useCORS: true
      });
      
      document.body.removeChild(contentElement);
      
      const image = canvas.toDataURL('image/png');
      const link = document.createElement('a');
      link.download = `readings-${date}.png`;
      link.href = image;
      link.click();
      
    } catch (error) {
      console.error('Error generating image:', error);
      alert('Failed to generate image. Please try again.');
    }
  };

  const handleDownload = (format = 'txt') => {
    const firstReadingText = cleanText(readingData.readings?.firstReading?.text || '');
    const psalmText = cleanText(readingData.readings?.responsorialPsalm?.text || '');
    const secondReadingText = cleanText(readingData.readings?.secondReading?.text || '');
    const gospelText = cleanText(readingData.readings?.gospel?.text || '');
    
    const title = `${readingData.celebration} - ${formatDate(date)}`;
    const yearInfo = `Liturgical Year: ${readingData.yearCycle || 'Unknown'}`;
    
    let content = '';
    let filename = `readings-${date}`;
    let mimeType = '';
    
    switch(format) {
      case 'txt':
        content = `${title}\n${yearInfo}\n\n` +
          `FIRST READING: ${readingData.readings?.firstReading?.citation || ''}\n${firstReadingText}\n\n` +
          `RESPONSORIAL PSALM: ${readingData.readings?.responsorialPsalm?.citation || ''}\n${psalmText}\n\n` +
          (readingData.readings?.secondReading ? 
            `SECOND READING: ${readingData.readings.secondReading.citation}\n${secondReadingText}\n\n` : '') +
          `GOSPEL: ${readingData.readings?.gospel?.citation || ''}\n${gospelText}`;
        mimeType = 'text/plain';
        filename += '.txt';
        break;
        
      case 'html':
        content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; max-width: 800px; margin: 40px auto; padding: 20px; background: white; }
    h1 { color: #800080; }
    h2 { color: #00c6ff; border-bottom: 1px solid #ccc; }
    .citation { color: #800080; font-weight: bold; }
    .reading { margin-bottom: 30px; background: white; padding: 20px; border-radius: 8px; }
    .gospel { border-left: 4px solid #FFD700; }
    .gospel h2 { color: #b8860b; }
    .psalm-response { color: #800080; font-style: italic; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${readingData.celebration}</h1>
  <p>${formatDate(date)}</p>
  <p>${yearInfo}</p>
  
  <div class="reading">
    <h2>First Reading <span class="citation">${readingData.readings?.firstReading?.citation || ''}</span></h2>
    <p>${firstReadingText.replace(/\n/g, '<br>')}</p>
  </div>
  
  <div class="reading">
    <h2>Responsorial Psalm <span class="citation">${readingData.readings?.responsorialPsalm?.citation || ''}</span></h2>
    ${readingData.readings?.responsorialPsalm?.response ? 
      `<p class="psalm-response"><strong>R. ${readingData.readings.responsorialPsalm.response}</strong></p>` : ''}
    <p>${psalmText.replace(/\n/g, '<br>')}</p>
  </div>
  
  ${readingData.readings?.secondReading ? `
  <div class="reading">
    <h2>Second Reading <span class="citation">${readingData.readings.secondReading.citation}</span></h2>
    <p>${secondReadingText.replace(/\n/g, '<br>')}</p>
  </div>
  ` : ''}
  
  <div class="reading gospel">
    <h2>Gospel <span class="citation">${readingData.readings?.gospel?.citation || ''}</span></h2>
    <p>${gospelText.replace(/\n/g, '<br>')}</p>
  </div>
  
  <div class="footer">
    <p>Readings from • Zetech Catholic Action Portal</p>
  </div>
</body>
</html>`;
        mimeType = 'text/html';
        filename += '.html';
        break;
        
      case 'pdf':
        handlePrint();
        setShowDownloadOptions(false);
        return;
        
      case 'doc':
        content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    body { font-family: 'Times New Roman', Times, serif; max-width: 800px; margin: 40px auto; padding: 20px; }
    h1 { color: #800080; font-size: 28px; text-align: center; }
    h2 { color: #800080; font-size: 22px; border-bottom: 1px solid #00c6ff; }
    .citation { color: #00c6ff; font-weight: normal; font-size: 16px; }
    .reading { margin-bottom: 30px; }
    .gospel h2 { color: #b8860b; border-bottom-color: #FFD700; }
    .psalm-response { color: #800080; font-style: italic; }
    p { line-height: 1.6; font-size: 16px; }
    .footer { margin-top: 40px; text-align: center; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <h1>${readingData.celebration}</h1>
  <p style="text-align: center; font-size: 18px;">${formatDate(date)}</p>
  <p style="text-align: center; color: #00c6ff;">${yearInfo}</p>
  
  <div class="reading">
    <h2>First Reading <span class="citation">${readingData.readings?.firstReading?.citation || ''}</span></h2>
    <p>${firstReadingText.replace(/\n/g, '<br>')}</p>
  </div>
  
  <div class="reading">
    <h2>Responsorial Psalm <span class="citation">${readingData.readings?.responsorialPsalm?.citation || ''}</span></h2>
    ${readingData.readings?.responsorialPsalm?.response ? 
      `<p class="psalm-response"><strong>R. ${readingData.readings.responsorialPsalm.response}</strong></p>` : ''}
    <p>${psalmText.replace(/\n/g, '<br>')}</p>
  </div>
  
  ${readingData.readings?.secondReading ? `
  <div class="reading">
    <h2>Second Reading <span class="citation">${readingData.readings.secondReading.citation}</span></h2>
    <p>${secondReadingText.replace(/\n/g, '<br>')}</p>
  </div>
  ` : ''}
  
  <div class="reading gospel">
    <h2>Gospel <span class="citation">${readingData.readings?.gospel?.citation || ''}</span></h2>
    <p>${gospelText.replace(/\n/g, '<br>')}</p>
  </div>
  
  <div class="footer">
    <p>Readings Generated by • Zetech Catholic Action Portal</p>
  </div>
</body>
</html>`;
        mimeType = 'application/msword';
        filename += '.doc';
        break;
        
      default:
        return;
    }
    
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    setShowDownloadOptions(false);
  };

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingSpinner}></div>
          <h2 style={styles.loadingTitle}>Loading Daily Readings</h2>
          <p style={styles.loadingSubtitle}>Fetching readings for {formatDate(date)}...</p>
        </div>
      </div>
    );
  }

  if (error || !readingData) {
    return (
      <div style={styles.container}>
        <div style={styles.errorContainer}>
          <Church size={48} style={{ color: '#ef4444', marginBottom: '20px' }} />
          <h2 style={styles.errorTitle}>Readings Not Found</h2>
          <p style={styles.errorMessage}>{error || 'No readings available for this date'}</p>
          <button onClick={goToCalendar} style={styles.errorButton}>
            <ArrowLeft size={16} />
            <span>Back to Calendar</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
            <img src={logo} alt="ZUCA Logo" style={styles.logo} />
            <h1 style={styles.title}>Daily Readings</h1>
          </div>
          <div style={styles.headerRight}>
            <button onClick={handleShare} style={styles.iconButton} title="Share">
              <Share2 size={isMobile ? 18 : 20} />
            </button>
            <button onClick={handlePrint} style={styles.iconButton} title="Print">
              <Printer size={isMobile ? 18 : 20} />
            </button>
            
            <div style={{ position: 'relative' }}>
              <button onClick={() => setShowDownloadOptions(!showDownloadOptions)} style={styles.iconButton} title="Download">
                <Download size={isMobile ? 18 : 20} />
              </button>
              
              {showDownloadOptions && (
                <div style={styles.downloadDropdown}>
                  <button onClick={() => handleDownload('txt')}>📄 Text File (.txt)</button>
                  <button onClick={() => handleDownload('html')}>🌐 HTML File (.html)</button>
                  <button onClick={() => handleDownload('pdf')}>📑 Save as PDF</button>
                  <button onClick={() => handleDownload('doc')}>📝 Word Document (.doc)</button>
                  <button onClick={handleDownloadImage}>🖼️ Image (.png)</button>
                </div>
              )}
            </div>
            
            <Link to="/liturgical-calendar" style={styles.homeLink}>
              <ArrowLeft size={16} />
              <span>Calendar</span>
            </Link>
          </div>
        </div>

        <div style={styles.navigation}>
          <button onClick={goToPreviousDay} style={styles.navButton}>
            <ChevronLeft size={isMobile ? 18 : 24} />
            <span>Previous</span>
          </button>
          
          <div style={styles.dateDisplay}>
            <Calendar size={isMobile ? 16 : 20} color="#3b82f6" />
            <h2 style={styles.dateTitle}>{formatDate(date)}</h2>
          </div>
          
          <button onClick={goToNextDay} style={styles.navButton}>
            <span>Next</span>
            <ChevronRight size={isMobile ? 18 : 24} />
          </button>
        </div>

        <div style={{
          ...styles.celebrationHeader,
          background: getSeasonBg(readingData.season?.toLowerCase()),
          borderLeft: `6px solid ${getSeasonColor(readingData.season?.toLowerCase())}`
        }}>
          <div style={styles.celebrationHeaderLeft}>
            <h3 style={styles.celebrationName}>{readingData.celebration}</h3>
            <div style={styles.celebrationMeta}>
              <span style={styles.seasonBadge}>
                {readingData.season || readingData.seasonName}
              </span>
              {readingData.yearCycle && (
                <span style={styles.yearBadge}>
                  {readingData.yearCycle}
                </span>
              )}
            </div>
          </div>
        </div>

        <div style={styles.readingsContainer}>
          {readingData.readings?.firstReading && (
            <div style={styles.readingCard}>
              <div style={styles.readingHeader}>
                <Book size={20} color="#3b82f6" />
                <h4 style={styles.readingTitle}>First Reading</h4>
                <span style={styles.readingCitation}>
                  {readingData.readings.firstReading.citation}
                </span>
              </div>
              <div style={styles.readingContent}>
                <p style={styles.readingText}>
                  {cleanText(readingData.readings.firstReading.text) || "Reading text not available. Please refer to your Bible."}
                </p>
              </div>
            </div>
          )}

          {readingData.readings?.responsorialPsalm && (
            <div style={styles.readingCard}>
              <div style={styles.readingHeader}>
                <Star size={20} color="#3b82f6" />
                <h4 style={styles.readingTitle}>Responsorial Psalm</h4>
                <span style={styles.readingCitation}>
                  {readingData.readings.responsorialPsalm.citation}
                </span>
              </div>
              <div style={styles.readingContent}>
                {readingData.readings.responsorialPsalm.response && (
                  <p style={styles.psalmResponse}>
                    <strong>R. </strong>{readingData.readings.responsorialPsalm.response}
                  </p>
                )}
                <p style={styles.readingText}>
                  {cleanText(readingData.readings.responsorialPsalm.text) || readingData.readings.responsorialPsalm.verses || "Psalm text not available. Please refer to your Bible."}
                </p>
              </div>
            </div>
          )}

          {readingData.readings?.secondReading && (
            <div style={styles.readingCard}>
              <div style={styles.readingHeader}>
                <BookOpen size={20} color="#3b82f6" />
                <h4 style={styles.readingTitle}>Second Reading</h4>
                <span style={styles.readingCitation}>
                  {readingData.readings.secondReading.citation}
                </span>
              </div>
              <div style={styles.readingContent}>
                <p style={styles.readingText}>
                  {cleanText(readingData.readings.secondReading.text) || "Reading text not available. Please refer to your Bible."}
                </p>
              </div>
            </div>
          )}

          {readingData.readings?.gospel && (
            <div style={styles.readingCard}>
              <div style={styles.readingHeader}>
                <Sun size={20} color="#3b82f6" />
                <h4 style={styles.readingTitle}>Gospel</h4>
                <span style={styles.readingCitation}>
                  {readingData.readings.gospel.citation}
                </span>
              </div>
              <div style={styles.readingContent}>
                <p style={styles.gospelText}>
                  {cleanText(readingData.readings.gospel.text) || "Gospel text not available. Please refer to your Bible."}
                </p>
              </div>
            </div>
          )}

          {!readingData.readings?.firstReading && !readingData.readings?.gospel && (
            <div style={styles.noReadingsCard}>
              <Church size={48} color="#94a3b8" />
              <h3 style={styles.noReadingsTitle}>No Readings Available</h3>
              <p style={styles.noReadingsText}>
                ZUCA does not provide full readings for this date.
                Please check the Lectionary or consult your Bible.
              </p>
              <button onClick={goToCalendar} style={styles.calendarButton}>
                Back to Calendar
              </button>
            </div>
          )}
        </div>

        <div style={styles.footer}>
          <p>Readings Generated By ZUCA Portal • {readingData.yearCycle || 'Liturgical Year'}</p>
          <p style={styles.credit}>Zetech Catholic Action Portal</p>
        </div>
      </div>

      {showShareModal && (
        <div style={styles.modalOverlay} onClick={() => setShowShareModal(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button style={styles.modalClose} onClick={() => setShowShareModal(false)}>
              <X size={20} />
            </button>
            <h3 style={styles.modalTitle}>Share Readings</h3>
            <div style={styles.modalBody}>
              <p style={styles.modalText}>Copy the link below:</p>
              <div style={styles.shareUrlContainer}>
                <input
                  type="text"
                  value={window.location.href}
                  readOnly
                  style={styles.shareUrlInput}
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(window.location.href);
                    alert('Link copied to clipboard!');
                  }}
                  style={styles.copyButton}
                >
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @media print {
          body { background: white; color: black; }
          button, .no-print { display: none !important; }
        }
        
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

const styles = {
  container: {
    minHeight: '100vh',
    background: '#f8fafc',
    padding: '20px',
    fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  content: {
    maxWidth: '900px',
    margin: '0 auto',
    width: '100%',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    flexWrap: 'wrap',
    gap: '10px',
  },
  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
  },
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    position: 'relative',
  },
  logo: {
    width: '40px',
    height: '40px',
    borderRadius: '50%',
    border: '2px solid #3b82f6',
  },
  title: {
    color: '#1e293b',
    fontWeight: 'bold',
    margin: 0,
    fontSize: '24px',
  },
  iconButton: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    width: '36px',
    height: '36px',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s ease',
  },
  homeLink: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    color: '#3b82f6',
    textDecoration: 'none',
    background: '#ffffff',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    padding: '8px 14px',
    fontSize: '14px',
    fontWeight: '500',
  },
  downloadDropdown: {
    position: 'absolute',
    top: '40px',
    right: 0,
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px',
    zIndex: 100,
    minWidth: '180px',
    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
  },
  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    background: '#ffffff',
    borderRadius: '12px',
    padding: '12px 20px',
    border: '1px solid #e2e8f0',
  },
  navButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '8px',
    padding: '8px 16px',
    color: '#475569',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
  },
  dateDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  dateTitle: {
    color: '#1e293b',
    fontSize: '16px',
    margin: 0,
    fontWeight: '600',
  },
  celebrationHeader: {
    padding: '20px',
    borderRadius: '12px',
    marginBottom: '20px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
  },
  celebrationHeaderLeft: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
  },
  celebrationName: {
    color: '#1e293b',
    fontSize: '22px',
    fontWeight: 'bold',
    margin: 0,
  },
  celebrationMeta: {
    display: 'flex',
    gap: '10px',
  },
  seasonBadge: {
    background: '#f1f5f9',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    color: '#475569',
    fontWeight: '500',
  },
  yearBadge: {
    background: '#fef3c7',
    padding: '4px 12px',
    borderRadius: '16px',
    fontSize: '12px',
    color: '#d97706',
    fontWeight: '500',
  },
  readingsContainer: {
    display: 'flex',
    flexDirection: 'column',
    gap: '20px',
    marginBottom: '30px',
  },
  readingCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    border: '1px solid #e2e8f0',
  },
  readingHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    marginBottom: '16px',
    flexWrap: 'wrap',
  },
  readingTitle: {
    color: '#1e293b',
    fontSize: '18px',
    fontWeight: '600',
    margin: 0,
  },
  readingCitation: {
    color: '#3b82f6',
    fontSize: '14px',
    fontWeight: '500',
    marginLeft: 'auto',
  },
  readingContent: {
    color: '#334155',
    fontSize: '16px',
    lineHeight: '1.7',
  },
  readingText: {
    margin: 0,
    whiteSpace: 'pre-line',
  },
  gospelText: {
    margin: 0,
    whiteSpace: 'pre-line',
    color: '#b8860b',
    fontWeight: '500',
  },
  psalmResponse: {
    color: '#800080',
    marginBottom: '12px',
    fontStyle: 'italic',
  },
  noReadingsCard: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '40px',
    textAlign: 'center',
    border: '1px solid #e2e8f0',
  },
  noReadingsTitle: {
    color: '#1e293b',
    fontSize: '20px',
    margin: '15px 0 10px',
  },
  noReadingsText: {
    color: '#64748b',
    fontSize: '14px',
    marginBottom: '20px',
  },
  calendarButton: {
    background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '12px',
    marginTop: '30px',
    padding: '20px',
    borderTop: '1px solid #e2e8f0',
  },
  credit: {
    marginTop: '5px',
    fontSize: '11px',
  },
  loadingContainer: {
    minHeight: '100vh',
    background: '#f8fafc',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingContent: {
    textAlign: 'center',
  },
  loadingSpinner: {
    width: '40px',
    height: '40px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#3b82f6',
    borderRadius: '50%',
    margin: '0 auto 16px',
    animation: 'spin 0.8s linear infinite',
  },
  loadingTitle: {
    color: '#1e293b',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },
  loadingSubtitle: {
    color: '#64748b',
    fontSize: '14px',
  },
  errorContainer: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '20px',
    textAlign: 'center',
  },
  errorTitle: {
    color: '#1e293b',
    fontSize: '24px',
    marginBottom: '10px',
  },
  errorMessage: {
    color: '#64748b',
    fontSize: '16px',
    marginBottom: '20px',
  },
  errorButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#3b82f6',
    border: 'none',
    borderRadius: '8px',
    padding: '10px 20px',
    color: 'white',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
  },
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    backdropFilter: 'blur(4px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    padding: '10px',
  },
  modalContent: {
    background: '#ffffff',
    borderRadius: '12px',
    padding: '24px',
    maxWidth: '400px',
    width: '90%',
    position: 'relative',
    border: '1px solid #e2e8f0',
  },
  modalClose: {
    position: 'absolute',
    top: '12px',
    right: '12px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: '#1e293b',
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '16px',
  },
  modalBody: {
    marginTop: '10px',
  },
  modalText: {
    color: '#64748b',
    fontSize: '14px',
    marginBottom: '10px',
  },
  shareUrlContainer: {
    display: 'flex',
    gap: '8px',
  },
  shareUrlInput: {
    flex: 1,
    padding: '10px',
    borderRadius: '6px',
    border: '1px solid #e2e8f0',
    background: '#f8fafc',
    color: '#1e293b',
    fontSize: '12px',
  },
  copyButton: {
    padding: '10px 16px',
    borderRadius: '6px',
    border: 'none',
    background: '#3b82f6',
    color: 'white',
    cursor: 'pointer',
    fontWeight: '500',
  },
};

export default FullReadings;