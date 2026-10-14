import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  Calendar, ChevronLeft, ChevronRight, Sun, Moon, Cloud, 
  Star, Church, Book, Heart, Droplet, Leaf, Sparkles,
  AlertCircle, RefreshCw, ChevronDown, Eye, EyeOff,
  Filter, Download, Share2, Info, X, Award,
  Cross, Crown, Feather, Music, Bell, Coffee,
  Search, Calendar as CalendarIcon, BookOpen,
  ArrowRight, Clock, Tag, Layers, Hash
} from 'lucide-react';
import { publicApi } from '../api';
import logo from '../assets/zuca-logo.png';

const LiturgicalCalendar = () => {
  const navigate = useNavigate();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [monthData, setMonthData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDay, setSelectedDay] = useState(null);
  const [showLegend, setShowLegend] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  const [showModal, setShowModal] = useState(false);
  const [viewMode, setViewMode] = useState('grid');
  const [searchModal, setSearchModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchType, setSearchType] = useState('date');
  const [selectedSeason, setSelectedSeason] = useState('all');
  const [selectedYear, setSelectedYear] = useState('all');

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const liturgicalSeasons = {
    advent: { 
      color: '#800080',
      boldColor: '#4c007d',
      name: 'Advent', 
      icon: <Star size={isMobile ? 10 : 16} color="#FFD700" />,
      bg: 'rgba(128, 0, 128, 0.15)',
      border: '#800080',
      textColor: '#800080',
      darkTextColor: '#4c007d',
      description: 'Season of waiting and preparation'
    },
    christmas: { 
      color: '#FFFFFF',
      boldColor: '#f5f5f5',
      name: 'Christmas', 
      icon: <Sparkles size={isMobile ? 10 : 16} color="#FFD700" />,
      bg: 'rgba(255, 255, 255, 0.9)',
      border: '#FFD700',
      textColor: '#1e293b',
      darkTextColor: '#0f172a',
      description: 'Celebrate the birth of our Lord'
    },
    lent: { 
      color: '#800080',
      boldColor: '#4c007d',
      name: 'Lent', 
      icon: <Cloud size={isMobile ? 10 : 16} color="#FFA500" />,
      bg: 'rgba(128, 0, 128, 0.15)',
      border: '#800080',
      textColor: '#800080',
      darkTextColor: '#4c007d',
      description: 'Prayer, fasting, and almsgiving'
    },
    easter: { 
      color: '#FFFFFF',
      boldColor: '#f5f5f5',
      name: 'Easter', 
      icon: <Sun size={isMobile ? 10 : 16} color="#FFD700" />,
      bg: 'rgba(255, 255, 255, 0.9)',
      border: '#FFD700',
      textColor: '#1e293b',
      darkTextColor: '#0f172a',
      description: 'Rejoice in the Resurrection'
    },
    ordinary: { 
      color: '#008000',
      boldColor: '#006400',
      name: 'Ordinary Time', 
      icon: <Leaf size={isMobile ? 10 : 16} color="#008000" />,
      bg: 'rgba(0, 128, 0, 0.1)',
      border: '#008000',
      textColor: '#008000',
      darkTextColor: '#006400',
      description: 'Grow in faith day by day'
    },
  };

  const celebrationTypes = {
    solemnity: { 
      color: '#B8860B',
      boldColor: '#8B6914',
      bg: 'rgba(184, 134, 11, 0.15)',
      border: '#B8860B',
      label: 'Solemnity',
      icon: '👑'
    },
    feast: { 
      color: '#0099cc',
      boldColor: '#0077aa',
      bg: 'rgba(0, 153, 204, 0.12)',
      border: '#0099cc',
      label: 'Feast',
      icon: '⭐'
    },
    memorial: { 
      color: '#059669',
      boldColor: '#047857',
      bg: 'rgba(5, 150, 105, 0.12)',
      border: '#059669',
      label: 'Memorial',
      icon: '🕊️'
    },
    'optional memorial': { 
      color: '#7c3aed',
      boldColor: '#6d28d9',
      bg: 'rgba(124, 58, 237, 0.12)',
      border: '#7c3aed',
      label: 'Optional Memorial',
      icon: '🌸'
    },
    weekday: { 
      color: '#475569',
      boldColor: '#334155',
      bg: 'rgba(71, 85, 105, 0.1)',
      border: '#475569',
      label: 'Weekday',
      icon: '📅'
    },
  };

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const dayNames = isMobile 
    ? ['S', 'M', 'T', 'W', 'T', 'F', 'S']
    : ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const fullDayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  useEffect(() => {
    fetchMonthData();
  }, [currentDate]);

  const fetchMonthData = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const year = currentDate.getFullYear();
      const month = String(currentDate.getMonth() + 1).padStart(2, '0');
      
      const response = await publicApi.get(`/api/calendar/month/${year}/${month}`);
      
      const dataByDay = {};
      if (Array.isArray(response.data)) {
        response.data.forEach(day => {
          const dayDate = new Date(day.date);
          const dayNum = dayDate.getDate();
          dataByDay[dayNum] = day;
        });
      }
      
      setMonthData(dataByDay);
      setError(null);
      
    } catch (err) {
      console.error('Error fetching month data:', err);
      setError('Failed to load calendar data.');
      generateSampleData();
    } finally {
      setLoading(false);
    }
  };

  const generateSampleData = () => {
    const sample = {};
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      const dayOfWeek = date.getDay();
      const isSunday = dayOfWeek === 0;
      
      let season = 'ordinary';
      let seasonName = 'Ordinary Time';
      let color = '#008000';
      
      if (month === 2 || month === 3) {
        season = 'lent';
        seasonName = 'Lent';
        color = '#800080';
      } else if (month === 4) {
        season = 'easter';
        seasonName = 'Easter';
        color = '#FFFFFF';
      } else if (month === 11) {
        season = 'advent';
        seasonName = 'Advent';
        color = '#800080';
      } else if (month === 0) {
        season = 'christmas';
        seasonName = 'Christmas';
        color = '#FFFFFF';
      }
      
      let celebrationType = 'weekday';
      if (isSunday) celebrationType = 'solemnity';
      else if (i % 7 === 0) celebrationType = 'memorial';
      
      sample[i] = {
        id: i,
        date: date.toISOString(),
        season: season,
        seasonName: seasonName,
        celebration: `${fullDayNames[dayOfWeek]} - Week ${Math.ceil(i/7)}`,
        celebrationType: celebrationType,
        liturgicalColor: color,
        rank: isSunday ? 'Solemnity' : 'Weekday',
        holyDayOfObligation: false,
        yearCycle: 'Year B',
        readings: null
      };
    }
    
    setMonthData(sample);
  };

  const changeMonth = (increment) => {
    const newDate = new Date(currentDate);
    newDate.setMonth(currentDate.getMonth() + increment);
    setCurrentDate(newDate);
    setSelectedDay(null);
  };

  const handleDayClick = (day) => {
    setSelectedDay(day);
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedDay(null);
  };

  const goToFullReadings = (day) => {
    const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
    const formattedDate = `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
    navigate(`/readings/${formattedDate}`);
  };

  const goToToday = () => {
    setCurrentDate(new Date());
    setSelectedDay(null);
  };

  const openSearch = () => {
    setSearchModal(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const closeSearch = () => {
    setSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const performSearch = async () => {
    if (!searchQuery.trim() && searchType !== 'season') return;
    
    setSearchLoading(true);
    
    try {
      let endpoint = '';
      const params = {};
      
      switch(searchType) {
        case 'date':
          endpoint = `/api/calendar/search/date/${searchQuery}`;
          break;
        case 'verse':
          endpoint = `/api/calendar/search/verse/${encodeURIComponent(searchQuery)}`;
          break;
        case 'keyword':
          endpoint = `/api/calendar/search/keyword/${encodeURIComponent(searchQuery)}`;
          break;
        case 'season':
          endpoint = `/api/calendar/search/season/${selectedSeason}`;
          if (selectedYear !== 'all') params.year = selectedYear;
          break;
        default:
          return;
      }
      
      const response = await publicApi.get(endpoint, { params });
      setSearchResults(response.data);
    } catch (err) {
      console.error('Search error:', err);
      setSearchResults([]);
    } finally {
      setSearchLoading(false);
    }
  };

  const getDaysInMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const getSeasonInfo = (dayData) => {
    if (!dayData || !dayData.season) return liturgicalSeasons.ordinary;
    return liturgicalSeasons[dayData.season] || liturgicalSeasons.ordinary;
  };

  const getCelebrationTypeInfo = (type) => {
    if (!type) return celebrationTypes.weekday;
    return celebrationTypes[type] || celebrationTypes.weekday;
  };

  const formatDayDate = (day) => {
    return new Date(currentDate.getFullYear(), currentDate.getMonth(), day).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const getCelebrationShort = (celebration) => {
    if (!celebration) return '';
    if (isMobile) {
      if (celebration.length > 12) {
        return celebration.substring(0, 10) + '…';
      }
      return celebration;
    }
    if (celebration.length > 25) {
      return celebration.substring(0, 22) + '…';
    }
    return celebration;
  };

  const getTypeIcon = (type) => {
    const icons = {
      'solemnity': '👑',
      'feast': '⭐',
      'memorial': '🕊️',
      'optional memorial': '🌸',
      'weekday': '📅'
    };
    return icons[type] || '📅';
  };

  const renderReadings = (readingsObj) => {
    if (!readingsObj) return null;
    
    try {
      const readings = [];
      
      if (readingsObj.firstReading) {
        readings.push({ title: "First Reading", citation: readingsObj.firstReading.citation });
      }
      if (readingsObj.responsorialPsalm) {
        readings.push({ title: "Psalm", citation: readingsObj.responsorialPsalm.citation });
      }
      if (readingsObj.secondReading) {
        readings.push({ title: "Second Reading", citation: readingsObj.secondReading.citation });
      }
      if (readingsObj.gospel) {
        readings.push({ title: "Gospel", citation: readingsObj.gospel.citation });
      }
      
      if (readings.length === 0) return null;
      
      return (
        <div style={styles.modalReadingsSection}>
          <h4 style={styles.modalReadingsTitle}>Daily Readings</h4>
          {readings.map((reading, index) => (
            <div key={index} style={styles.modalReadingItem}>
              <span style={styles.modalReadingLabel}>{reading.title}:</span>
              <span style={styles.modalReadingCitation}>{reading.citation}</span>
            </div>
          ))}
        </div>
      );
    } catch (e) {
      return null;
    }
  };

  const renderListView = () => {
    const daysInMonth = getDaysInMonth();
    const today = new Date();
    const items = [];

    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = monthData[day];
      const date = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = date.toDateString() === today.toDateString();
      const dayOfWeek = date.getDay();
      const celebrationType = dayData ? getCelebrationTypeInfo(dayData.celebrationType) : celebrationTypes.weekday;
      const seasonInfo = dayData ? getSeasonInfo(dayData) : liturgicalSeasons.ordinary;
      
      // Determine text color for white backgrounds
      const isWhiteSeason = seasonInfo.color === '#FFFFFF';
      const textColor = isWhiteSeason ? '#1e293b' : seasonInfo.color;
      
      items.push(
        <div 
          key={`list-${day}`}
          onClick={() => handleDayClick(day)}
          style={{
            ...styles.listItem,
            backgroundColor: isToday ? '#eff6ff' : '#ffffff',
            borderLeft: `6px solid ${seasonInfo.color === '#FFFFFF' ? '#FFD700' : seasonInfo.color}`,
          }}
        >
          <div style={styles.listItemLeft}>
            <div style={styles.listItemDay}>
              <span style={{
                ...styles.listItemDayNumber,
                color: isToday ? '#3b82f6' : textColor,
                fontWeight: 'bold',
              }}>{day}</span>
              <span style={styles.listItemDayName}>{fullDayNames[dayOfWeek].substring(0, 3)}</span>
            </div>
            <div style={styles.listItemContent}>
              <div style={styles.listItemCelebration}>
                <span style={styles.listItemIcon}>{getTypeIcon(dayData?.celebrationType)}</span>
                <span style={{
                  ...styles.listItemCelebrationText,
                  color: textColor,
                  fontWeight: '600',
                }}>
                  {dayData?.celebration || 'No celebration'}
                </span>
              </div>
              {dayData && (
                <div style={styles.listItemMeta}>
                  <span style={{
                    ...styles.listItemSeason,
                    color: textColor,
                    fontWeight: '500',
                  }}>{dayData.seasonName}</span>
                  {dayData.holyDayOfObligation && (
                    <span style={styles.listItemHoly}>⛪ Holy Day</span>
                  )}
                </div>
              )}
            </div>
          </div>
          {dayData && (
            <div style={styles.listItemRight}>
              <span style={{...styles.listItemArrow, color: textColor}}>→</span>
            </div>
          )}
        </div>
      );
    }
    return items;
  };

  const renderCalendarGrid = () => {
    const daysInMonth = getDaysInMonth();
    const firstDay = getFirstDayOfMonth();
    const totalCells = Math.ceil((daysInMonth + firstDay) / 7) * 7;
    const today = new Date();
    
    const cells = [];
    
    dayNames.forEach((day, index) => {
      const isWeekend = index === 0 || index === 6;
      cells.push(
        <div key={`header-${index}`} style={{
          ...styles.dayHeader,
          color: isWeekend ? '#800080' : '#64748b',
          fontSize: isMobile ? '11px' : '14px',
          padding: isMobile ? '4px 0' : '10px 0',
          fontWeight: '600',
        }}>
          {day}
        </div>
      );
    });
    
    for (let i = 0; i < firstDay; i++) {
      cells.push(<div key={`empty-${i}`} style={styles.emptyCell}></div>);
    }
    
    for (let day = 1; day <= daysInMonth; day++) {
      const dayData = monthData[day];
      const celebrationType = dayData ? getCelebrationTypeInfo(dayData.celebrationType) : celebrationTypes.weekday;
      const seasonInfo = dayData ? getSeasonInfo(dayData) : liturgicalSeasons.ordinary;
      const currentDateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), day);
      const isToday = currentDateObj.toDateString() === today.toDateString();
      const dayOfWeek = currentDateObj.getDay();
      const isSunday = dayOfWeek === 0;
      
      // Determine text color for white backgrounds (Christmas/Easter)
      const isWhiteSeason = seasonInfo.color === '#FFFFFF';
      const textColor = isWhiteSeason ? '#1e293b' : seasonInfo.color;
      const borderColor = isWhiteSeason ? '#FFD700' : seasonInfo.color;
      const barColor = isWhiteSeason ? '#FFD700' : seasonInfo.color;
      
      let cellStyle = {
        ...styles.dayCell,
        background: '#ffffff',
        border: isToday ? '3px solid #3b82f6' : `2px solid ${borderColor}`,
        minHeight: isMobile ? '50px' : '100px',
        padding: isMobile ? '2px' : '10px',
        aspectRatio: isMobile ? '1 / 1' : 'auto',
        boxShadow: isToday ? '0 0 0 2px rgba(59, 130, 246, 0.2)' : `0 1px 2px rgba(0,0,0,0.05)`,
        position: 'relative',
      };
      
      cells.push(
        <div 
          key={`day-${day}`}
          style={cellStyle}
          onClick={() => handleDayClick(day)}
        >
          <div style={{
            ...styles.dayNumber,
            backgroundColor: isToday ? '#3b82f6' : (isSunday ? `${seasonInfo.color}20` : 'transparent'),
            color: isToday ? 'white' : textColor,
            fontWeight: isToday ? 'bold' : (isSunday ? 'bold' : '600'),
            fontSize: isMobile ? '14px' : '18px',
            width: isMobile ? '28px' : '36px',
            height: isMobile ? '28px' : '36px',
            marginBottom: isMobile ? '2px' : '8px',
            borderRadius: '50%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: isSunday && !isToday ? `2px solid ${textColor}` : 'none',
          }}>
            {day}
          </div>
          
          {dayData && (
            <>
              <div style={{
                ...styles.dayCelebration,
                fontSize: isMobile ? '8px' : '11px',
                lineHeight: isMobile ? '1.2' : '1.4',
                marginBottom: isMobile ? '2px' : '6px',
                maxHeight: isMobile ? '24px' : 'none',
                overflow: 'hidden',
                display: '-webkit-box',
                WebkitLineClamp: isMobile ? 2 : 3,
                WebkitBoxOrient: 'vertical',
                color: textColor,
                fontWeight: '600',
              }}>
                {getCelebrationShort(dayData.celebration)}
              </div>
              
              <div style={styles.dayMeta}>
                <span style={{
                  ...styles.dayType,
                  fontSize: isMobile ? '9px' : '12px',
                  padding: isMobile ? '2px 4px' : '2px 6px',
                  backgroundColor: celebrationType.bg,
                  color: celebrationType.color,
                  border: `1px solid ${celebrationType.border}`,
                  borderRadius: '12px',
                  fontWeight: '500',
                }}>
                  {getTypeIcon(dayData.celebrationType)}
                </span>
                
                {dayData.holyDayOfObligation && (
                  <span style={{
                    ...styles.holyBadge,
                    fontSize: isMobile ? '10px' : '14px',
                  }} title="Holy Day of Obligation">
                    ⛪
                  </span>
                )}
              </div>
            </>
          )}
          
          {/* Bold color indicator bar at the top */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            height: '4px',
            backgroundColor: barColor,
            borderRadius: '8px 8px 0 0',
          }} />
        </div>
      );
    }
    
    const remainingCells = totalCells - cells.length;
    for (let i = 0; i < remainingCells; i++) {
      cells.push(<div key={`empty-end-${i}`} style={styles.emptyCell}></div>);
    }
    
    return cells;
  };

  const DayModal = ({ day, onClose }) => {
    if (!day || !monthData[day]) return null;
    
    const dayData = monthData[day];
    const seasonInfo = getSeasonInfo(dayData);
    const celebrationTypeInfo = getCelebrationTypeInfo(dayData.celebrationType);
    
    const hasReadings = dayData.readings && (
      dayData.readings.firstReading ||
      dayData.readings.responsorialPsalm ||
      dayData.readings.gospel
    );
    
    // Determine text color for white backgrounds
    const isWhiteSeason = seasonInfo.color === '#FFFFFF';
    const textColor = isWhiteSeason ? '#1e293b' : seasonInfo.color;
    
    return (
      <div style={styles.modalOverlay} onClick={onClose}>
        <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
          <button style={styles.modalCloseButton} onClick={onClose}>
            <X size={isMobile ? 20 : 24} />
          </button>
          
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>{formatDayDate(day)}</h2>
          </div>
          
          <div style={styles.modalBody}>
            <div style={styles.modalSection}>
              <div style={{
                ...styles.modalCelebration,
                borderLeft: `6px solid ${isWhiteSeason ? '#FFD700' : seasonInfo.color}`,
              }}>
                <span style={styles.modalCelebrationIcon}>{getTypeIcon(dayData.celebrationType)}</span>
                <span style={{
                  ...styles.modalCelebrationName,
                  color: textColor,
                }}>{dayData.celebration}</span>
              </div>
            </div>
            
            <div style={styles.modalSection}>
              <div style={{
                ...styles.modalSeasonBadge,
                backgroundColor: seasonInfo.bg,
                color: textColor,
                borderColor: isWhiteSeason ? '#FFD700' : seasonInfo.border,
              }}>
                {seasonInfo.icon} {dayData.seasonName}
              </div>
            </div>
            
            <div style={styles.modalDetailsGrid}>
              <div style={styles.modalDetailItem}>
                <span style={styles.modalDetailLabel}>Type</span>
                <span style={{
                  ...styles.modalDetailValue,
                  color: celebrationTypeInfo.color,
                  fontWeight: '600',
                }}>
                  {dayData.celebrationType}
                </span>
              </div>
              
              <div style={styles.modalDetailItem}>
                <span style={styles.modalDetailLabel}>Color</span>
                <div style={styles.modalColorDisplay}>
                  <span style={{
                    ...styles.modalColorDot,
                    backgroundColor: seasonInfo.color === '#cccccc' ? '#ffffff' : seasonInfo.color,
                    boxShadow: `0 0 0 2px ${seasonInfo.color}40`,
                  }}></span>
                  <span style={{
                    ...styles.modalDetailValue,
                    color: textColor,
                    fontWeight: '600',
                  }}>
                    {seasonInfo.color === '#800080' ? 'Purple' :
                     seasonInfo.color === '#008000' ? 'Green' : 
                     seasonInfo.color === '#FF0000' ? 'Red' : 'White'}
                  </span>
                </div>
              </div>
              
              {dayData.rank && (
                <div style={styles.modalDetailItem}>
                  <span style={styles.modalDetailLabel}>Rank</span>
                  <span style={styles.modalDetailValue}>{dayData.rank}</span>
                </div>
              )}
              
              {dayData.holyDayOfObligation && (
                <div style={styles.modalDetailItem}>
                  <span style={styles.modalDetailLabel}>Obligation</span>
                  <span style={styles.modalDetailValue}>⛪ Holy Day</span>
                </div>
              )}
              
              {dayData.yearCycle && (
                <div style={styles.modalDetailItem}>
                  <span style={styles.modalDetailLabel}>Year</span>
                  <span style={styles.modalDetailValue}>{dayData.yearCycle}</span>
                </div>
              )}
            </div>
            
            {renderReadings(dayData.readings)}
            
            {hasReadings && (
              <button 
                onClick={() => goToFullReadings(day)}
                style={styles.fullReadingsButton}
              >
                <BookOpen size={18} />
                <span>View Full Readings</span>
                <ArrowRight size={18} />
              </button>
            )}
            
            {!hasReadings && dayData.source !== 'fallback' && (
              <div style={styles.noReadingsMessage}>
                <Info size={16} />
                <span>No readings available for this day</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const SearchModal = ({ onClose, navigate }) => {
    const [availableSeasons, setAvailableSeasons] = useState(['all']);
    const [localSearchQuery, setLocalSearchQuery] = useState('');
    const [debounceTimer, setDebounceTimer] = useState(null);
    const [loadingFilters, setLoadingFilters] = useState(false);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchResults, setSearchResults] = useState([]);
    const [searchType, setSearchType] = useState('keyword');
    const [selectedSeason, setSelectedSeason] = useState('all');
    const [selectedYear, setSelectedYear] = useState('all');
    const [messageInfo, setMessageInfo] = useState({ show: false, text: '' });
    
    const [searchYear, setSearchYear] = useState(new Date().getFullYear().toString());
    const [searchMonth, setSearchMonth] = useState('all');
    const [searchDay, setSearchDay] = useState('all');
    
    const months = [
      { value: 'all', label: 'All Months' },
      { value: '1', label: 'January' },
      { value: '2', label: 'February' },
      { value: '3', label: 'March' },
      { value: '4', label: 'April' },
      { value: '5', label: 'May' },
      { value: '6', label: 'June' },
      { value: '7', label: 'July' },
      { value: '8', label: 'August' },
      { value: '9', label: 'September' },
      { value: '10', label: 'October' },
      { value: '11', label: 'November' },
      { value: '12', label: 'December' }
    ];
    
    const days = ['all', ...Array.from({ length: 31 }, (_, i) => (i + 1).toString())];

    useEffect(() => {
      const fetchFilters = async () => {
        setLoadingFilters(true);
        try {
          const response = await publicApi.get('/api/calendar/stats');
          
          if (response.data?.bySeason && response.data.bySeason.length > 0) {
            const seasons = response.data.bySeason.map(s => s.season);
            setAvailableSeasons(['all', ...seasons]);
          } else {
            setAvailableSeasons(['all', 'advent', 'christmas', 'lent', 'easter', 'ordinary']);
          }
        } catch (err) {
          console.error('Error fetching filters:', err);
          setAvailableSeasons(['all', 'advent', 'christmas', 'lent', 'easter', 'ordinary']);
        } finally {
          setLoadingFilters(false);
        }
      };
      
      fetchFilters();
    }, []);

    const performDateSearch = async () => {
      if (!searchYear || searchYear.trim() === '') {
        setMessageInfo({ show: true, text: 'Please enter a year' });
        return;
      }
      
      setSearchLoading(true);
      setMessageInfo({ show: false, text: '' });
      
      try {
        let response;
        
        if (searchMonth !== 'all' && searchDay !== 'all') {
          const monthPadded = searchMonth.padStart(2, '0');
          const dayPadded = searchDay.padStart(2, '0');
          const endpoint = `/api/calendar/search/date/${searchYear}-${monthPadded}-${dayPadded}`;
          response = await publicApi.get(endpoint);
          
          if (response.data.length === 0 && parseInt(searchYear) > 2035) {
            const calendarResponse = await publicApi.get(`/api/calendar/date/${searchYear}/${searchMonth}/${searchDay}`);
            if (calendarResponse.data && !calendarResponse.data.error) {
              setSearchResults([calendarResponse.data]);
              setSearchLoading(false);
              return;
            }
          }
          setSearchResults(response.data);
        }
        else if (searchMonth !== 'all' && searchDay === 'all') {
          response = await publicApi.get(`/api/calendar/month/${searchYear}/${searchMonth}`);
          setSearchResults(response.data);
        }
        else {
          response = await publicApi.get(`/api/calendar/search/date/${searchYear}`);
          setSearchResults(response.data);
        }
        
        if (response && response.data.length === 0) {
          if (searchMonth !== 'all' && searchDay !== 'all') {
            setMessageInfo({ show: true, text: `No readings found for ${months.find(m => m.value === searchMonth)?.label} ${searchDay}, ${searchYear}` });
          } else if (parseInt(searchYear) > 2035) {
            setMessageInfo({ show: true, text: `Data for ${searchYear} is available! Select a specific date to view readings.` });
          } else {
            setMessageInfo({ show: true, text: `No results found for ${searchYear}` });
          }
        }
      } catch (err) {
        console.error('Date search error:', err);
        setSearchResults([]);
        setMessageInfo({ show: true, text: 'Error searching. Please try again.' });
      } finally {
        setSearchLoading(false);
      }
    };

    const handleSearchChange = (e) => {
      const value = e.target.value;
      setLocalSearchQuery(value);
      
      if (debounceTimer) clearTimeout(debounceTimer);
      
      if (!value.trim()) {
        setSearchResults([]);
        setMessageInfo({ show: false, text: '' });
        return;
      }
      
      const timer = setTimeout(() => {
        performTextSearch(value);
      }, 500);
      
      setDebounceTimer(timer);
    };

    const performTextSearch = async (query) => {
      if (!query.trim()) return;
      
      setSearchLoading(true);
      setMessageInfo({ show: false, text: '' });
      
      try {
        let endpoint = '';
        
        if (searchType === 'keyword') {
          endpoint = `/api/calendar/search/keyword/${encodeURIComponent(query)}`;
        } else if (searchType === 'verse') {
          endpoint = `/api/calendar/search/verse/${encodeURIComponent(query)}`;
        }
        
        const response = await publicApi.get(endpoint);
        setSearchResults(response.data);
        
        if (response.data.length === 0) {
          setMessageInfo({ show: true, text: 'No results found' });
        }
      } catch (err) {
        console.error('Search error:', err);
        setSearchResults([]);
        setMessageInfo({ show: true, text: 'Error searching. Please try again.' });
      } finally {
        setSearchLoading(false);
      }
    };

    const performSeasonSearch = async () => {
      if (selectedSeason === 'all' && selectedYear === 'all') {
        setMessageInfo({ show: true, text: 'Please select a specific season or enter a year to search' });
        setSearchResults([]);
        return;
      }
      
      setSearchLoading(true);
      setMessageInfo({ show: false, text: '' });
      
      try {
        let endpoint = `/api/calendar/search/season/${selectedSeason}`;
        if (selectedYear !== 'all') {
          endpoint += `?year=${selectedYear}`;
        }
        
        const response = await publicApi.get(endpoint);
        setSearchResults(response.data);
        
        if (response.data.length === 0) {
          setMessageInfo({ show: true, text: 'No results found for this combination' });
        }
      } catch (err) {
        console.error('Season search error:', err);
        setSearchResults([]);
        setMessageInfo({ show: true, text: 'Error searching. Please try again.' });
      } finally {
        setSearchLoading(false);
      }
    };

    useEffect(() => {
      return () => {
        if (debounceTimer) clearTimeout(debounceTimer);
      };
    }, [debounceTimer]);

    return (
      <div style={styles.modalOverlay} onClick={onClose}>
        <div style={{...styles.modalContent, maxWidth: '600px'}} onClick={(e) => e.stopPropagation()}>
          <button style={styles.modalCloseButton} onClick={onClose}>
            <X size={24} />
          </button>
          
          <div style={styles.modalHeader}>
            <h2 style={styles.modalTitle}>Search Liturgical Calendar</h2>
          </div>
          
          <div style={styles.modalBody}>
            <div style={styles.searchTypeSelector}>
              <button
                onClick={() => {
                  setSearchType('keyword');
                  setLocalSearchQuery('');
                  setSearchResults([]);
                  setMessageInfo({ show: false, text: '' });
                }}
                style={{
                  ...styles.searchTypeButton,
                  backgroundColor: searchType === 'keyword' ? 'rgba(0,198,255,0.1)' : '#ffffff',
                  borderColor: searchType === 'keyword' ? '#00c6ff' : '#e2e8f0',
                  color: searchType === 'keyword' ? '#00c6ff' : '#64748b',
                }}
              >
                <Hash size={16} />
                <span>Keyword</span>
              </button>
              <button
                onClick={() => {
                  setSearchType('date');
                  setSearchMonth('all');
                  setSearchDay('all');
                  setSearchYear(new Date().getFullYear().toString());
                  setSearchResults([]);
                  setMessageInfo({ show: false, text: '' });
                }}
                style={{
                  ...styles.searchTypeButton,
                  backgroundColor: searchType === 'date' ? 'rgba(0,198,255,0.1)' : '#ffffff',
                  borderColor: searchType === 'date' ? '#00c6ff' : '#e2e8f0',
                  color: searchType === 'date' ? '#00c6ff' : '#64748b',
                }}
              >
                <Calendar size={16} />
                <span>Date</span>
              </button>
              <button
                onClick={() => {
                  setSearchType('verse');
                  setLocalSearchQuery('');
                  setSearchResults([]);
                  setMessageInfo({ show: false, text: '' });
                }}
                style={{
                  ...styles.searchTypeButton,
                  backgroundColor: searchType === 'verse' ? 'rgba(0,198,255,0.1)' : '#ffffff',
                  borderColor: searchType === 'verse' ? '#00c6ff' : '#e2e8f0',
                  color: searchType === 'verse' ? '#00c6ff' : '#64748b',
                }}
              >
                <Book size={16} />
                <span>Verse</span>
              </button>
              <button
                onClick={() => {
                  setSearchType('season');
                  setLocalSearchQuery('');
                  setSearchResults([]);
                  setMessageInfo({ show: false, text: '' });
                }}
                style={{
                  ...styles.searchTypeButton,
                  backgroundColor: searchType === 'season' ? 'rgba(0,198,255,0.1)' : '#ffffff',
                  borderColor: searchType === 'season' ? '#00c6ff' : '#e2e8f0',
                  color: searchType === 'season' ? '#00c6ff' : '#64748b',
                }}
              >
                <Layers size={16} />
                <span>Season</span>
              </button>
            </div>
            
            {searchType === 'date' && (
              <div style={styles.dateSearchContainer}>
                <div style={styles.filterRow}>
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Year:</label>
                    <input
                      type="text"
                      placeholder="e.g., 2024, 2050, 2100"
                      value={searchYear}
                      onChange={(e) => {
                        const value = e.target.value;
                        if (/^\d*$/.test(value) && value.length <= 4) {
                          setSearchYear(value);
                          setSearchResults([]);
                          setMessageInfo({ show: false, text: '' });
                        }
                      }}
                      style={styles.yearInput}
                    />
                  </div>
                  
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Month:</label>
                    <select
                      value={searchMonth}
                      onChange={(e) => {
                        setSearchMonth(e.target.value);
                        setSearchDay('all');
                        setSearchResults([]);
                        setMessageInfo({ show: false, text: '' });
                      }}
                      style={styles.filterSelect}
                    >
                      {months.map(month => (
                        <option key={month.value} value={month.value}>{month.label}</option>
                      ))}
                    </select>
                  </div>
                  
                  <div style={styles.filterGroup}>
                    <label style={styles.filterLabel}>Day:</label>
                    <select
                      value={searchDay}
                      onChange={(e) => {
                        setSearchDay(e.target.value);
                        setSearchResults([]);
                        setMessageInfo({ show: false, text: '' });
                      }}
                      style={styles.filterSelect}
                      disabled={searchMonth === 'all'}
                    >
                      {days.map(day => (
                        <option key={day} value={day}>
                          {day === 'all' ? 'All Days' : day}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
                
                <button onClick={performDateSearch} style={styles.searchButtonLarge}>
                  <Search size={18} />
                  <span>Search Dates</span>
                </button>
                
                <p style={styles.searchHint}>
                  {searchYear && searchMonth === 'all' 
                    ? `Searching entire year ${searchYear}` 
                    : searchYear && searchDay === 'all' 
                      ? `Searching ${months.find(m => m.value === searchMonth)?.label} ${searchYear}`
                      : searchYear && `Searching ${months.find(m => m.value === searchMonth)?.label} ${searchDay}, ${searchYear}`
                  }
                </p>
              </div>
            )}
            
            {(searchType === 'keyword' || searchType === 'verse') && (
              <div style={styles.searchInputContainer}>
                <input
                  type="text"
                  placeholder={
                    searchType === 'verse' ? 'Enter Bible verse (e.g., John 3:16)' :
                    'Enter keyword (e.g., "Joseph", "Lent")'
                  }
                  value={localSearchQuery}
                  onChange={handleSearchChange}
                  style={styles.searchInput}
                  autoFocus
                />
                {searchLoading && <div style={styles.searchInputSpinner}></div>}
              </div>
            )}
            
            {searchType === 'season' && (
              <div style={styles.seasonFilters}>
                {loadingFilters ? (
                  <div style={styles.searchLoading}>
                    <div style={styles.loadingSpinner}></div>
                    <p>Loading available seasons...</p>
                  </div>
                ) : (
                  <>
                    <div style={styles.filterRow}>
                      <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Season:</label>
                        <select
                          value={selectedSeason}
                          onChange={(e) => {
                            setSelectedSeason(e.target.value);
                            setSearchResults([]);
                            setMessageInfo({ show: false, text: '' });
                          }}
                          style={styles.filterSelect}
                        >
                          {availableSeasons.map(season => (
                            <option key={season} value={season}>
                              {season === 'all' ? 'All Seasons' : 
                               season.charAt(0).toUpperCase() + season.slice(1)}
                            </option>
                          ))}
                        </select>
                      </div>
                      
                      <div style={styles.filterGroup}>
                        <label style={styles.filterLabel}>Year:</label>
                        <input
                          type="text"
                          placeholder="e.g., 2024, 2050, 2100 (or 'all')"
                          value={selectedYear === 'all' ? '' : selectedYear}
                          onChange={(e) => {
                            const value = e.target.value;
                            if (value === '' || value.toLowerCase() === 'all') {
                              setSelectedYear('all');
                            } else if (/^\d{4}$/.test(value)) {
                              setSelectedYear(value);
                            }
                            setSearchResults([]);
                            setMessageInfo({ show: false, text: '' });
                          }}
                          style={styles.yearInput}
                        />
                      </div>
                    </div>
                    
                    <button onClick={performSeasonSearch} style={styles.searchButtonLarge}>
                      <Search size={18} />
                      <span>Search Season</span>
                    </button>
                  </>
                )}
              </div>
            )}
            
            {searchLoading && (
              <div style={styles.searchLoading}>
                <div style={styles.loadingSpinner}></div>
                <p>Searching...</p>
              </div>
            )}
            
            {!searchLoading && searchResults.length > 0 && (
              <div style={styles.searchResults}>
                <h3 style={styles.searchResultsTitle}>
                  Found {searchResults.length} result{searchResults.length > 1 ? 's' : ''}
                </h3>
                <div style={styles.searchResultsList}>
                  {searchResults.map((result, index) => (
                    <div
                      key={index}
                      style={styles.searchResultItem}
                      onClick={() => {
                        const resultDate = new Date(result.date);
                        const formattedDate = `${resultDate.getFullYear()}-${String(resultDate.getMonth() + 1).padStart(2, '0')}-${String(resultDate.getDate()).padStart(2, '0')}`;
                        onClose();
                        navigate(`/readings/${formattedDate}`);
                      }}
                    >
                      <div style={styles.searchResultDate}>
                        {new Date(result.date).toLocaleDateString('en-US', {
                          weekday: 'short',
                          month: 'short',
                          day: 'numeric',
                          year: 'numeric'
                        })}
                      </div>
                      <div style={styles.searchResultCelebration}>
                        {result.celebration}
                      </div>
                      {result.readings?.firstReading && (
                        <div style={styles.searchResultReading}>
                          📖 {result.readings.firstReading.citation}
                        </div>
                      )}
                      <ArrowRight size={14} style={styles.searchResultArrow} />
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {!searchLoading && messageInfo.show && (
              <div style={styles.messageBox}>
                <Info size={20} />
                <p>{messageInfo.text}</p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };
          
  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingContent}>
          <div style={styles.loadingAnimation}>
            <div style={styles.loadingRing}></div>
            <div style={styles.loadingRingInner}></div>
{loading && <img src={logo} alt="Loading..." style={{ width: '50px', height: '70px' }} />}          </div>
          <h2 style={styles.loadingTitle}>Loading Liturgical Calendar</h2>
          <p style={styles.loadingSubtitle}>Fetching {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.content}>
        <div style={styles.header}>
          <div style={styles.headerLeft}>
           <img src={logo} alt="Loading..." style={{ width: '33px', height: '47px' }} />
            <h1 style={styles.title}>Liturgical Calendar</h1>
          </div>
          <div style={styles.headerRight}>
            <button onClick={openSearch} style={styles.searchHeaderButton}>
              <Search size={isMobile ? 16 : 20} />
              <span>{isMobile ? '' : 'Search'}</span>
            </button>
            <button onClick={() => navigate('/dashboard')} style={styles.homeLink}>
              ← Dashboard
            </button>
          </div>
        </div>

        {error && (
          <div style={styles.errorBanner}>
            <AlertCircle size={16} />
            <span style={styles.errorText}>{error}</span>
            <button onClick={fetchMonthData} style={styles.retryButton}>
              <RefreshCw size={12} />
            </button>
          </div>
        )}

        <div style={styles.navigation}>
          <button onClick={() => changeMonth(-1)} style={styles.navButton}>
            <ChevronLeft size={isMobile ? 18 : 24} />
          </button>
          <div style={styles.monthDisplay}>
            <h2 style={styles.monthYear}>
              {monthNames[currentDate.getMonth()]} {currentDate.getFullYear()}
            </h2>
            <button onClick={goToToday} style={styles.todayButton}>
              Today
            </button>
          </div>
          <button onClick={() => changeMonth(1)} style={styles.navButton}>
            <ChevronRight size={isMobile ? 18 : 24} />
          </button>
        </div>

        {isMobile && (
          <div style={styles.viewToggle}>
            <button 
              onClick={() => setViewMode('grid')}
              style={{
                ...styles.viewToggleButton,
                backgroundColor: viewMode === 'grid' ? '#00c6ff' : '#ffffff',
                color: viewMode === 'grid' ? 'white' : '#64748b',
              }}
            >
              Grid
            </button>
            <button 
              onClick={() => setViewMode('list')}
              style={{
                ...styles.viewToggleButton,
                backgroundColor: viewMode === 'list' ? '#00c6ff' : '#ffffff',
                color: viewMode === 'list' ? 'white' : '#64748b',
              }}
            >
              List
            </button>
          </div>
        )}

        {isMobile && (
          <button 
            onClick={() => setShowLegend(!showLegend)}
            style={styles.legendToggle}
          >
            {showLegend ? 'Hide Legend' : 'Show Legend'}
          </button>
        )}

        {(showLegend || !isMobile) && (
          <div style={styles.legend}>
            <div style={styles.legendItem}>
              <span style={{...styles.legendDot, backgroundColor: '#800080'}}></span>
              <span>Purple (Advent/Lent)</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{...styles.legendDot, backgroundColor: '#008000'}}></span>
              <span>Green (Ordinary Time)</span>
            </div>
            <div style={styles.legendItem}>
              <span style={{...styles.legendDot, backgroundColor: '#FFD700', border: '1px solid #B8860B'}}></span>
              <span>Gold/White (Christmas/Easter)</span>
            </div>
            <div style={styles.legendItem}>
              <span style={styles.legendIcon}>👑</span>
              <span>Solemnity</span>
            </div>
            <div style={styles.legendItem}>
              <span style={styles.legendIcon}>⭐</span>
              <span>Feast</span>
            </div>
            <div style={styles.legendItem}>
              <span style={styles.legendIcon}>🕊️</span>
              <span>Memorial</span>
            </div>
          </div>
        )}

        {isMobile && viewMode === 'list' ? (
          <div style={styles.listView}>
            {renderListView()}
          </div>
        ) : (
          <div style={styles.calendarWrapper}>
            <div style={styles.calendarGrid}>
              {renderCalendarGrid()}
            </div>
          </div>
        )}

        {selectedDay && monthData[selectedDay] && (
          <DayModal day={selectedDay} onClose={closeModal} />
        )}
        
        {searchModal && <SearchModal onClose={closeSearch} navigate={navigate} />}

        <div style={styles.footer}>
          <p>© {new Date().getFullYear()} Zetech Catholic Action Portal</p>
          <p style={styles.credit}>Built by CHRISTECH WEBSYS</p>
        </div>
      </div>

      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0) scale(1); }
          33% { transform: translate(30px, -50px) scale(1.1); }
          66% { transform: translate(-20px, 20px) scale(0.9); }
        }

        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }

        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }

        @keyframes slideUp {
          from { transform: translateY(50px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }

        select option {
          background-color: white !important;
          color: black !important;
        }
        
        select:focus option {
          background-color: white !important;
          color: black !important;
        }
        
        select option:hover {
          background-color: #f0f0f0 !important;
          color: black !important;
        }
        
        select option:checked {
          background-color: #00c6ff !important;
          color: white !important;
        }
      `}</style>
    </div>
  );
};

// ================== STYLES ==================
const styles = {
  container: {
  minHeight: '100vh',
  background: '#f8fafc',
  padding: '8px',
  position: 'relative',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  width: '100%',
  overflowX: 'hidden',
  boxSizing: 'border-box',
  display: 'flex',
  justifyContent: 'center',
},

content: {
  position: 'relative',
  zIndex: 1,
  maxWidth: '1200px',
  width: '100%',
  padding: '0 8px',
  boxSizing: 'border-box',
},

  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    flexWrap: 'wrap',
    gap: '10px',
    width: '100%',
  },

  headerLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    marginLeft: '15px'
  },

  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
  },

  logo: {
    width: '35px',
    height: '35px',
    borderRadius: '50%',
    border: '2px solid #00c6ff',
    '@media (min-width: 768px)': {
      width: '50px',
      height: '50px',
    },
  },

  title: {
    color: '#1e293b',
    fontWeight: 'bold',
    margin: 0,
    fontSize: '20px',
    '@media (min-width: 768px)': {
      fontSize: '28px',
    },
  },

  searchHeaderButton: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '6px 12px',
    color: '#64748b',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    ':hover': {
      background: '#f1f5f9',
    },
  },

  homeLink: {
    color: '#00c6ff',
    textDecoration: 'none',
    background: '#ffffff',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    padding: '6px 12px',
    fontSize: '13px',
    '@media (min-width: 768px)': {
      padding: '8px 16px',
      fontSize: '14px',
    },
  },

  yearInput: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '14px',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box',
    '&:focus': {
      borderColor: '#00c6ff',
    },
    '&::placeholder': {
      color: '#94a3b8',
    },
  },

  errorBanner: {
    background: '#fef2f2',
    border: '1px solid #fecaca',
    borderRadius: '8px',
    padding: '8px 12px',
    marginBottom: '15px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    color: '#dc2626',
    fontSize: '13px',
    width: '100%',
    boxSizing: 'border-box',
  },

  errorText: {
    flex: 1,
  },

  retryButton: {
    marginLeft: 'auto',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '50%',
    width: '28px',
    height: '28px',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },

  navigation: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '15px',
    background: '#ffffff',
    borderRadius: '40px',
    padding: '5px 10px',
    width: '100%',
    boxSizing: 'border-box',
    boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
    border: '1px solid #e2e8f0',
    '@media (min-width: 768px)': {
      padding: '10px 20px',
    },
  },

  navButton: {
    background: '#f8fafc',
    border: '1px solid #e2e8f0',
    borderRadius: '50%',
    width: '32px',
    height: '32px',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    '@media (min-width: 768px)': {
      width: '40px',
      height: '40px',
    },
  },

  monthDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },

  monthYear: {
    color: '#1e293b',
    margin: 0,
    fontSize: '16px',
    '@media (min-width: 768px)': {
      fontSize: '20px',
    },
  },

  todayButton: {
    background: '#eff6ff',
    border: '1px solid #bfdbfe',
    borderRadius: '16px',
    color: '#3b82f6',
    cursor: 'pointer',
    padding: '3px 8px',
    fontSize: '11px',
    '@media (min-width: 768px)': {
      padding: '4px 12px',
      fontSize: '12px',
    },
  },

  viewToggle: {
    display: 'flex',
    gap: '8px',
    marginBottom: '10px',
    width: '100%',
  },

  viewToggleButton: {
    flex: 1,
    padding: '8px',
    borderRadius: '20px',
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    cursor: 'pointer',
    fontSize: '14px',
    transition: 'all 0.2s ease',
    textAlign: 'center',
  },

  legendToggle: {
    background: '#ffffff',
    border: '1px solid #e2e8f0',
    borderRadius: '20px',
    padding: '6px 12px',
    color: '#64748b',
    fontSize: '12px',
    marginBottom: '10px',
    cursor: 'pointer',
    width: '100%',
    textAlign: 'center',
  },

  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '6px',
    background: '#ffffff',
    borderRadius: '12px',
    padding: '8px 10px',
    marginBottom: '10px',
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #e2e8f0',
    '@media (min-width: 768px)': {
      gap: '15px',
      padding: '12px 20px',
      marginBottom: '20px',
    },
  },

  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
    color: '#64748b',
    fontSize: '10px',
    '@media (min-width: 768px)': {
      fontSize: '12px',
      gap: '8px',
    },
  },

  legendDot: {
    width: '12px',
    height: '12px',
    borderRadius: '4px',
    '@media (min-width: 768px)': {
      width: '14px',
      height: '14px',
    },
  },

  legendIcon: {
    fontSize: '12px',
    '@media (min-width: 768px)': {
      fontSize: '14px',
    },
  },

  calendarWrapper: {
    background: '#ffffff',
    borderRadius: '16px',
    padding: '8px',
    marginBottom: '10px',
    width: '100%',
    boxSizing: 'border-box',
    border: '1px solid #e2e8f0',
    '@media (min-width: 768px)': {
      padding: '20px',
      marginBottom: '20px',
    },
  },

calendarGrid: {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 1fr)',
  gap: '2px',
  width: '100%',
  margin: '0 auto',
  '@media (min-width: 768px)': {
    gap: '4px',
  },
},

  dayHeader: {
    textAlign: 'center',
    fontWeight: '600',
  },

  emptyCell: {
    background: '#f8fafc',
    borderRadius: '8px',
    aspectRatio: '1 / 1',
    width: '100%',
    border: '1px solid #e2e8f0',
  },

  dayCell: {
  borderRadius: '8px',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  display: 'flex',
  flexDirection: 'column',
  width: '100%',
  boxSizing: 'border-box',
  position: 'relative',
  minHeight: '60px',
  padding: '4px',
  aspectRatio: '1 / 1',
  ':hover': {
    transform: 'scale(1.02)',
    boxShadow: '0 4px 8px rgba(0,0,0,0.1)',
  },
  '@media (min-width: 768px)': {
    minHeight: '100px',
    padding: '10px',
    aspectRatio: 'auto',
  },
},

  dayNumber: {},

  dayCelebration: {},

  dayMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    width: '100%',
    marginTop: 'auto',
  },

  dayType: {},

  holyBadge: {
    lineHeight: 1,
  },

  listView: {
    display: 'flex',
    flexDirection: 'column',
    gap: '6px',
    marginBottom: '15px',
    width: '100%',
  },

  listItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    background: '#ffffff',
    border: '1px solid #e2e8f0',
  },

  listItemLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    flex: 1,
  },

  listItemDay: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    minWidth: '40px',
  },

  listItemDayNumber: {
    fontSize: '18px',
    fontWeight: 'bold',
  },

  listItemDayName: {
    fontSize: '10px',
    color: '#64748b',
  },

  listItemContent: {
    flex: 1,
  },

  listItemCelebration: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    marginBottom: '2px',
  },

  listItemIcon: {
    fontSize: '14px',
  },

  listItemCelebrationText: {
    fontSize: '13px',
    fontWeight: '500',
  },

  listItemMeta: {
    display: 'flex',
    gap: '8px',
    fontSize: '10px',
  },

  listItemSeason: {},

  listItemHoly: {
    color: '#f59e0b',
  },

  listItemRight: {
    marginLeft: '8px',
  },

  listItemArrow: {
    fontSize: '16px',
  },

  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    backdropFilter: 'blur(5px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    animation: 'fadeIn 0.3s ease',
    padding: '10px',
  },

  modalContent: {
    background: '#ffffff',
    borderRadius: '20px',
    padding: '20px',
    maxWidth: '500px',
    width: '90%',
    maxHeight: '90vh',
    overflowY: 'auto',
    position: 'relative',
    border: '1px solid #e2e8f0',
    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.4)',
    animation: 'slideUp 0.3s ease',
  },

  modalCloseButton: {
    position: 'absolute',
    top: '10px',
    right: '10px',
    background: '#f1f5f9',
    border: '1px solid #e2e8f0',
    borderRadius: '50%',
    width: '36px',
    height: '36px',
    color: '#64748b',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 2,
  },

  modalHeader: {
    marginBottom: '15px',
    paddingRight: '30px',
  },

  modalTitle: {
    color: '#1e293b',
    fontSize: '18px',
    fontWeight: 'bold',
    margin: 0,
  },

  modalBody: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
  },

  modalSection: {
    marginBottom: '5px',
  },

  modalCelebration: {
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    background: '#f8fafc',
    padding: '12px',
    borderRadius: '10px',
    border: '1px solid #e2e8f0',
  },

  modalCelebrationIcon: {
    fontSize: '20px',
  },

  modalCelebrationName: {
    fontSize: '16px',
    fontWeight: '600',
  },

  modalSeasonBadge: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '4px',
    padding: '6px 12px',
    borderRadius: '16px',
    fontSize: '13px',
    border: '1px solid',
  },

  dateSearchContainer: {
    marginBottom: '15px',
  },

  filterRow: {
    display: 'flex',
    gap: '10px',
    marginBottom: '15px',
    flexWrap: 'wrap',
  },

  searchHint: {
    color: '#64748b',
    fontSize: '12px',
    marginTop: '10px',
    fontStyle: 'italic',
    textAlign: 'center',
  },

  modalDetailsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    background: '#ffee00',
    borderRadius: '10px',
    padding: '12px',
    border: '1px solid #e2e8f0',
  },

  modalDetailItem: {
    display: 'flex',
    flexDirection: 'column',
    gap: '2px',
  },

  modalDetailLabel: {
    color: '#000000',
    fontSize: '11px',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
  },

  modalDetailValue: {
    color: '#000000',
    fontSize: '13px',
    fontWeight: '500',
  },

  modalColorDisplay: {
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },

  modalColorDot: {
    width: '14px',
    height: '14px',
    borderRadius: '50%',
  },

  modalReadingsSection: {
    background: '#f8fafc',
    borderRadius: '10px',
    padding: '12px',
    marginTop: '5px',
    border: '1px solid #e2e8f0',
  },

  modalReadingsTitle: {
    color: '#3b82f6',
    fontSize: '15px',
    fontWeight: 'bold',
    marginBottom: '8px',
  },

  modalReadingItem: {
    display: 'flex',
    gap: '8px',
    marginBottom: '6px',
    fontSize: '13px',
    padding: '4px 0',
    borderBottom: '1px solid #e2e8f0',
  },

  modalReadingLabel: {
    color: '#64748b',
    minWidth: '90px',
    fontSize: '12px',
  },

  modalReadingCitation: {
    color: '#00c6ff',
    fontWeight: '500',
    fontSize: '12px',
  },

  fullReadingsButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: 'linear-gradient(135deg, #3b82f6, #00c6ff)',
    border: 'none',
    borderRadius: '8px',
    padding: '12px',
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '10px',
    transition: 'transform 0.2s ease',
    ':hover': {
      transform: 'scale(1.02)',
    },
  },

  noReadingsMessage: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    background: '#f8fafc',
    borderRadius: '8px',
    padding: '12px',
    color: '#64748b',
    fontSize: '13px',
    marginTop: '10px',
    border: '1px solid #e2e8f0',
  },

  searchTypeSelector: {
    display: 'grid',
    gridTemplateColumns: 'repeat(2, 1fr)',
    gap: '8px',
    marginBottom: '15px',
  },

  searchTypeButton: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '6px',
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid',
    background: '#ffffff',
    cursor: 'pointer',
    fontSize: '13px',
    transition: 'all 0.2s ease',
  },

  searchInputContainer: {
    display: 'flex',
    gap: '8px',
    marginBottom: '15px',
  },

  searchInput: {
    flex: 1,
    padding: '12px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '14px',
    outline: 'none',
    ':focus': {
      borderColor: '#00c6ff',
    },
  },

  searchButton: {
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: '#00c6ff',
    color: 'white',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },

  seasonFilters: {
    display: 'flex',
    flexDirection: 'column',
    gap: '12px',
    marginBottom: '15px',
  },

  filterGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
    flex: 1,
  },

  filterLabel: {
    color: '#64748b',
    fontSize: '12px',
  },

  filterSelect: {
    padding: '10px',
    borderRadius: '8px',
    border: '1px solid #e2e8f0',
    background: '#ffffff',
    color: '#1e293b',
    fontSize: '14px',
    outline: 'none',
  },

  searchButtonLarge: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '12px',
    borderRadius: '8px',
    border: 'none',
    background: 'linear-gradient(135deg, #3b82f6, #00c6ff)',
    color: 'white',
    fontSize: '14px',
    fontWeight: 'bold',
    cursor: 'pointer',
    marginTop: '5px',
  },

  searchLoading: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '30px',
    gap: '10px',
  },

  loadingSpinner: {
    width: '30px',
    height: '30px',
    border: '3px solid #e2e8f0',
    borderTopColor: '#00c6ff',
    borderRadius: '50%',
    animation: 'spin 1s linear infinite',
  },

  searchResults: {
    marginTop: '15px',
  },

  searchResultsTitle: {
    color: '#1e293b',
    fontSize: '14px',
    fontWeight: 'bold',
    marginBottom: '10px',
  },

  searchResultsList: {
    display: 'flex',
    flexDirection: 'column',
    gap: '8px',
    maxHeight: '300px',
    overflowY: 'auto',
  },

  searchResultItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px',
    background: '#f8fafc',
    borderRadius: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: '1px solid #e2e8f0',
    ':hover': {
      background: '#f1f5f9',
    },
  },

  searchResultDate: {
    minWidth: '90px',
    color: '#00c6ff',
    fontSize: '12px',
    fontWeight: 'bold',
  },

  searchResultCelebration: {
    flex: 1,
    color: '#1e293b',
    fontSize: '13px',
  },

  searchResultReadings: {
    fontSize: '11px',
    color: '#64748b',
  },

  searchResultReading: {
    display: 'block',
  },

  searchResultArrow: {
    color: '#94a3b8',
  },

  messageBox: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    padding: '20px',
    background: '#f8fafc',
    borderRadius: '8px',
    color: '#64748b',
    fontSize: '13px',
    marginTop: '15px',
    border: '1px solid #e2e8f0',
  },

  footer: {
    textAlign: 'center',
    color: '#94a3b8',
    fontSize: '11px',
    marginTop: '15px',
    padding: '16px',
    borderTop: '1px solid #e2e8f0',
  },

  credit: {
    marginTop: '3px',
    color: '#94a3b8',
    fontSize: '10px',
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

  loadingAnimation: {
    position: 'relative',
    width: '70px',
    height: '70px',
    margin: '0 auto 15px',
  },

  loadingRing: {
    position: 'absolute',
    inset: 0,
    border: '3px solid #e2e8f0',
    borderRadius: '50%',
  },

  loadingRingInner: {
    position: 'absolute',
    inset: 0,
    border: '3px solid transparent',
    borderTopColor: '#3b82f6',
    borderRightColor: '#00c6ff',
    borderBottomColor: '#8b5cf6',
    borderLeftColor: '#3b82f6',
    borderRadius: '50%',
    animation: 'spin 1.5s linear infinite',
  },

  loadingIcon: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '28px',
    height: '28px',
    color: '#3b82f6',
  },

  loadingTitle: {
    color: '#1e293b',
    fontSize: '16px',
    fontWeight: 'bold',
    marginBottom: '5px',
  },

  loadingSubtitle: {
    color: '#64748b',
    fontSize: '12px',
  },
};

export default LiturgicalCalendar;