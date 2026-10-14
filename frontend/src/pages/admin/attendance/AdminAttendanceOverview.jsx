import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import BASE_URL from '../../../api';
import {
  Search, Filter, Download, User, Users, Calendar, 
  ChevronDown, ChevronUp, Eye, FileText, BarChart3,
  ArrowLeft, X, CheckCircle, XCircle, Clock, MapPin,
  TrendingUp, Award, Target, Mail
} from 'lucide-react';
import { FaUsers, FaCalendar } from 'react-icons/fa';
// Import for PDF generation
import jsPDF from 'jspdf';
import 'jspdf-autotable';
// Import for Word generation
import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, BorderStyle, AlignmentType } from 'docx';

export default function AdminAttendanceOverview() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    search: '',
    role: 'all',
    jumuiaId: 'all',
    fromDate: '',
    toDate: '',
    sortBy: 'fullName',
    sortOrder: 'asc'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10000000,
    total: 0,
    totalPages: 0
  });
  const [filterOptions, setFilterOptions] = useState({
    jumuias: []
  });
  const [selectedUser, setSelectedUser] = useState(null);
  const [showUserModal, setShowUserModal] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [showExportMenu, setShowExportMenu] = useState(false);
const [currentSemester, setCurrentSemester] = useState(null);
const [semesters, setSemesters] = useState([]);
const [selectedSemester, setSelectedSemester] = useState('current');
const [sendingReports, setSendingReports] = useState(false);
const [showSemesterManagement, setShowSemesterManagement] = useState(false);
const [activatingSemester, setActivatingSemester] = useState(false);

    const isMobileDevice = () => {
    return window.innerWidth < 768 || /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  };

  const getHeaders = () => ({
    Authorization: `Bearer ${localStorage.getItem('token')}`
  });

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams({
        page: pagination.page,
        limit: pagination.limit,
        ...filters
      });
      
      const response = await axios.get(
        `${BASE_URL}/api/attendance/admin/all-members-attendance?${params}`,
        { headers: getHeaders() }
      );
      
      setUsers(response.data.users);
      setPagination(prev => ({
        ...prev,
        total: response.data.pagination.total,
        totalPages: response.data.pagination.totalPages
      }));
      setFilterOptions(response.data.filters);
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setLoading(false);
    }
  };


  



  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  };

const handleViewUser = (userId) => {
  navigate(`/admin/attendance/member/${userId}`);
};

const fetchCurrentSemester = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/semesters/current`, {
      headers: getHeaders()
    });
    if (response.data.semester) {
      setCurrentSemester(response.data.semester);
    }
  } catch (error) {
    console.error('Error fetching semester:', error);
  }
};

const fetchAllSemesters = async () => {
  try {
    const response = await axios.get(`${BASE_URL}/api/semesters/all`, {
      headers: getHeaders()
    });
    if (response.data.semesters) {
      setSemesters(response.data.semesters);
    }
  } catch (error) {
    console.error('Error fetching semesters:', error);
  }
};

const handleSemesterChange = async (semesterId) => {
  setSelectedSemester(semesterId);
  
  try {
    setLoading(true);
    
    // Build params - just pass semesterId directly to backend
    const params = {};
    if (semesterId && semesterId !== 'all') {
      params.semesterId = semesterId;
    }
    // If semesterId === 'all', don't add any filter
    
    const response = await axios.get(
      `${BASE_URL}/api/attendance/admin/all-members-attendance`,
      { 
        headers: getHeaders(),
        params: params
      }
    );
    
    setUsers(response.data.users || []);
    setPagination(prev => ({
      ...prev,
      total: response.data.pagination?.total || 0,
      totalPages: response.data.pagination?.totalPages || 0
    }));
    
    // Clear the date filters since we're using semesterId now
    setFilters(prev => ({
      ...prev,
      fromDate: '',
      toDate: ''
    }));
    
  } catch (error) {
    console.error('Error filtering by semester:', error);
  } finally {
    setLoading(false);
  }
};

const handleSendReports = async () => {
  if (!currentSemester) {
    alert('No active semester found. Please activate a semester first.');
    return;
  }
  const confirmSend = window.confirm(
    `This will send semester reports to ALL users with attendance data in "${currentSemester.title}".\n\nAre you sure you want to continue?`
  );
  if (!confirmSend) return;
  setSendingReports(true);
  try {
    const response = await axios.post(
      `${BASE_URL}/api/semesters/${currentSemester.id}/send-reports`,
      {},
      { headers: getHeaders() }
    );
    alert(`✅ Reports sending started!\n\n${response.data.message}\n\nUsers will receive their reports via email.`);
  } catch (error) {
    console.error('Error sending reports:', error);
    alert('❌ Failed to send reports. Please try again.');
  } finally {
    setSendingReports(false);
  }
};

const handleActivateSemester = async (scheduleId, title) => {
  if (!window.confirm(`Activate "${title}" as the current semester?`)) return;
  
  setActivatingSemester(true);
  try {
    const response = await axios.put(
      `${BASE_URL}/api/semesters/${scheduleId}/activate`,
      {},
      { headers: getHeaders() }
    );
    alert(`✅ ${response.data.message}`);
    // Refresh semesters
    await fetchAllSemesters();
    await fetchCurrentSemester();
  } catch (error) {
    console.error('Error activating semester:', error);
    alert('❌ Failed to activate semester. Please try again.');
  } finally {
    setActivatingSemester(false);
  }
};

const handleDeactivateSemester = async () => {
  if (!window.confirm('Deactivate the current semester? This will make no semester active.')) return;
  
  setActivatingSemester(true);
  try {
    const response = await axios.post(
      `${BASE_URL}/api/semesters/deactivate`,
      {},
      { headers: getHeaders() }
    );
    alert(`✅ ${response.data.message}`);
    // Refresh semesters
    await fetchAllSemesters();
    await fetchCurrentSemester();
  } catch (error) {
    console.error('Error deactivating semester:', error);
    alert('❌ Failed to deactivate semester. Please try again.');
  } finally {
    setActivatingSemester(false);
  }
};

 useEffect(() => {
  fetchUsers();
  fetchCurrentSemester();
  fetchAllSemesters();
}, [pagination.page, filters]);

  // Export to PDF
  const exportToPDF = async () => {
  try {
    setExporting(true);
    
    // Detect if mobile device
    const isMobile = isMobileDevice();
    
    // Dynamically import jsPDF
    const { default: jsPDF } = await import('jspdf');
    
    // Use portrait for mobile, landscape for desktop
    const orientation = isMobile ? 'portrait' : 'landscape';
    const doc = new jsPDF(orientation, 'mm', 'a4');
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Adjust font sizes for mobile - LARGER for better visibility
    const titleSize = isMobile ? 22 : 20;
    const headerSize = isMobile ? 12 : 9;
    const textSize = isMobile ? 10 : 8;
    const smallTextSize = isMobile ? 8 : 7;
    
    // Title
    doc.setFontSize(titleSize);
    doc.setTextColor(0, 51, 102);
    doc.setFont('helvetica', 'bold');
    doc.text('ZUCA ATTENDANCE REPORT', pageWidth / 2, 25, { align: 'center' });
    
    // Date
    doc.setFontSize(headerSize);
    doc.setTextColor(100);
    doc.setFont('helvetica', 'normal');
    const dateStr = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    doc.text(`Generated: ${dateStr}`, pageWidth / 2, 35, { align: 'center' });
    
    // Summary stats
    const totalMembers = users.length;
    const highAttendance = users.filter(u => u.attendanceRate >= 80).length;
    const executives = users.filter(u => u.executivePosition).length;
    const totalCheckins = users.reduce((sum, u) => sum + (u.attendedMeetings || 0), 0);
    
    doc.setFontSize(isMobile ? 10 : 9);
    doc.setTextColor(60);
    doc.setFont('helvetica', 'normal');
    
    if (isMobile) {
      // Mobile - Full page content with proper spacing
      // Stats on one line or wrapped
      doc.text(`Total: ${totalMembers} | High: ${highAttendance} | Exec: ${executives} | Check-ins: ${totalCheckins}`, pageWidth / 2, 45, { align: 'center' });
      
      let y = 55;
      
      // Table headers - Mobile optimized with wider columns
      const headers = ['#', 'Name', 'Role', 'Jumuia', 'Att/Total', 'Rate'];
      // Adjusted column widths to fill the page
      const colWidths = [10, 55, 40, 40, 30, 25];
      
      // Draw header with proper sizing
      doc.setFillColor(0, 51, 102);
      doc.rect(8, y - 5, pageWidth - 16, 12, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(isMobile ? 9 : 7);
      doc.setFont('helvetica', 'bold');
      
      let x = 8;
      headers.forEach((h, i) => {
        doc.text(h, x + 2, y + 3);
        x += colWidths[i];
      });
      
      y += 10;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(isMobile ? 8 : 6);
      doc.setFont('helvetica', 'normal');
      
      // Draw rows for mobile - FILL THE PAGE
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        
        // Check if we need a new page
        if (y > pageHeight - 30) {
          doc.addPage();
          y = 20;
          
          // Redraw header on new page
          doc.setFillColor(0, 51, 102);
          doc.rect(8, y - 5, pageWidth - 16, 12, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(isMobile ? 9 : 7);
          doc.setFont('helvetica', 'bold');
          
          x = 8;
          headers.forEach((h, i) => {
            doc.text(h, x + 2, y + 3);
            x += colWidths[i];
          });
          
          y += 10;
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(isMobile ? 8 : 6);
          doc.setFont('helvetica', 'normal');
        }
        
        // Alternate row colors with proper height
        if (i % 2 === 0) {
          doc.setFillColor(245, 247, 250);
          doc.rect(8, y - 4, pageWidth - 16, 9, 'F');
        }
        
        const rowData = [
          String(i + 1),
          user.fullName || 'N/A',
          user.executivePosition || user.role || 'Member',
          user.homeJumuia?.name || 'N/A',
          `${user.attendedMeetings || 0}/${user.totalMeetings || 0}`,
          `${user.attendanceRate || 0}%`
        ];
        
        x = 8;
        rowData.forEach((text, colIndex) => {
          let displayText = String(text);
          // Better truncation for mobile - show more text
          if (displayText.length > 18 && colIndex === 1) {
            displayText = displayText.substring(0, 16) + '…';
          }
          if (displayText.length > 12 && (colIndex === 2 || colIndex === 3)) {
            displayText = displayText.substring(0, 10) + '…';
          }
          doc.text(displayText, x + 2, y + 3);
          x += colWidths[colIndex];
        });
        
        y += 10;
      }
      
      // Footer for mobile with spacing
      doc.setFontSize(smallTextSize);
      doc.setTextColor(150);
      doc.text(`ZUCA Portal | © ${new Date().getFullYear()} ZUCA`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      
    } else {
      // Desktop version - landscape (your existing code)
      // Table headers
      const headers = ['#', 'Name', 'Membership #', 'Role', 'Jumuia', 'Attended/Total', 'Rate'];
      const colWidths = [12, 60, 35, 45, 45, 35, 25];
      let y = 48;
      
      // Draw header
      doc.setFillColor(0, 51, 102);
      doc.rect(14, y - 4, 270, 10, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      
      let x = 14;
      headers.forEach((h, i) => {
        doc.text(h, x + 2, y + 2);
        x += colWidths[i];
      });
      
      y += 8;
      doc.setTextColor(0, 0, 0);
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      
      // Draw rows for desktop
      for (let i = 0; i < users.length; i++) {
        const user = users[i];
        
        if (y > 190) {
          doc.addPage();
          y = 20;
          
          doc.setFillColor(0, 51, 102);
          doc.rect(14, y - 4, 270, 10, 'F');
          doc.setTextColor(255, 255, 255);
          doc.setFontSize(9);
          doc.setFont('helvetica', 'bold');
          
          x = 14;
          headers.forEach((h, i) => {
            doc.text(h, x + 2, y + 2);
            x += colWidths[i];
          });
          
          y += 8;
          doc.setTextColor(0, 0, 0);
          doc.setFontSize(8);
          doc.setFont('helvetica', 'normal');
        }
        
        if (i % 2 === 0) {
          doc.setFillColor(245, 247, 250);
          doc.rect(14, y - 3, 270, 7, 'F');
        }
        
        const rowData = [
          String(i + 1),
          user.fullName || 'N/A',
          user.membership_number || 'N/A',
          user.executivePosition || user.role || 'Member',
          user.homeJumuia?.name || 'N/A',
          `${user.attendedMeetings || 0}/${user.totalMeetings || 0}`,
          `${user.attendanceRate || 0}%`
        ];
        
        x = 14;
        rowData.forEach((text, colIndex) => {
          doc.text(String(text), x + 2, y + 2);
          x += colWidths[colIndex];
        });
        
        y += 8;
      }
      
      // Footer for desktop
      doc.setFontSize(8);
      doc.setTextColor(150);
      doc.text(`Report generated by ZUCA Portal | © ${new Date().getFullYear()} ZUCA - All Rights Reserved`, pageWidth / 2, 205, { align: 'center' });
    }
    
    doc.save(`attendance_report_${new Date().toISOString().split('T')[0]}.pdf`);
    
  } catch (error) {
    console.error('PDF export error:', error);
    alert('Failed to export PDF. Error: ' + error.message);
  } finally {
    setExporting(false);
    setShowExportMenu(false);
  }
};

 // Export to Word (DOCX) - FULL PAGE VERSION
const exportToWord = async () => {
  try {
    setExporting(true);
    
    const { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, AlignmentType, WidthType, BorderStyle } = await import('docx');
    
    const doc = new Document({
      sections: [{
        properties: {
          page: {
            margin: {
              top: 720,   // 0.5 inch
              bottom: 720,
              left: 720,
              right: 720
            }
          }
        },
        children: [
          // Title - LARGER
          new Paragraph({
            children: [
              new TextRun({
                text: 'ZUCA ATTENDANCE REPORT',
                size: 36,        // Increased from 28
                bold: true,
                color: '003366',
                font: 'Arial'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 }
          }),
          // Date - LARGER
          new Paragraph({
            children: [
              new TextRun({
                text: `Generated: ${new Date().toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}`,
                size: 22,        // Increased from 18
                color: '666666',
                font: 'Arial'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 300 }
          }),
          // Summary - LARGER
          new Paragraph({
            children: [
              new TextRun({
                text: `Total Members: ${users.length}  |  `,
                size: 20,        // Increased from 18
                bold: true,
                font: 'Arial'
              }),
              new TextRun({
                text: `High Attendance (>80%): ${users.filter(u => u.attendanceRate >= 80).length}  |  `,
                size: 20,
                font: 'Arial'
              }),
              new TextRun({
                text: `Executives: ${users.filter(u => u.executivePosition).length}  |  `,
                size: 20,
                font: 'Arial'
              }),
              new TextRun({
                text: `Total Check-ins: ${users.reduce((sum, u) => sum + (u.attendedMeetings || 0), 0)}`,
                size: 20,
                font: 'Arial'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 }
          }),
          // Table - FULL WIDTH with larger text
          new Table({
            width: {
              size: 100,
              type: WidthType.PERCENTAGE
            },
            rows: [
              // Header - LARGER TEXT
              new TableRow({
                children: [
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: '#', bold: true, size: 22, color: 'FFFFFF' })],
                      alignment: AlignmentType.CENTER
                    })],
                    shading: { fill: '003366' },
                    width: { size: 5, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: 'Full Name', bold: true, size: 22, color: 'FFFFFF' })],
                      alignment: AlignmentType.CENTER
                    })],
                    shading: { fill: '003366' },
                    width: { size: 22, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: 'Membership #', bold: true, size: 22, color: 'FFFFFF' })],
                      alignment: AlignmentType.CENTER
                    })],
                    shading: { fill: '003366' },
                    width: { size: 14, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: 'Role', bold: true, size: 22, color: 'FFFFFF' })],
                      alignment: AlignmentType.CENTER
                    })],
                    shading: { fill: '003366' },
                    width: { size: 16, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: 'Jumuia', bold: true, size: 22, color: 'FFFFFF' })],
                      alignment: AlignmentType.CENTER
                    })],
                    shading: { fill: '003366' },
                    width: { size: 16, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: 'Att/Total', bold: true, size: 22, color: 'FFFFFF' })],
                      alignment: AlignmentType.CENTER
                    })],
                    shading: { fill: '003366' },
                    width: { size: 14, type: WidthType.PERCENTAGE }
                  }),
                  new TableCell({
                    children: [new Paragraph({ 
                      children: [new TextRun({ text: 'Rate', bold: true, size: 22, color: 'FFFFFF' })],
                      alignment: AlignmentType.CENTER
                    })],
                    shading: { fill: '003366' },
                    width: { size: 13, type: WidthType.PERCENTAGE }
                  })
                ]
              }),
              // Data rows - LARGER TEXT
              ...users.map((user, index) => {
                const isEven = index % 2 === 0;
                return new TableRow({
                  children: [
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: String(index + 1), size: 18 })],
                        alignment: AlignmentType.CENTER
                      })],
                      shading: { fill: isEven ? 'F5F5F5' : 'FFFFFF' },
                      width: { size: 5, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: user.fullName || 'N/A', size: 18 })]
                      })],
                      shading: { fill: isEven ? 'F5F5F5' : 'FFFFFF' },
                      width: { size: 22, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: user.membership_number || 'N/A', size: 18 })],
                        alignment: AlignmentType.CENTER
                      })],
                      shading: { fill: isEven ? 'F5F5F5' : 'FFFFFF' },
                      width: { size: 14, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: user.executivePosition || user.role || 'Member', size: 18 })]
                      })],
                      shading: { fill: isEven ? 'F5F5F5' : 'FFFFFF' },
                      width: { size: 16, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: user.homeJumuia?.name || 'N/A', size: 18 })]
                      })],
                      shading: { fill: isEven ? 'F5F5F5' : 'FFFFFF' },
                      width: { size: 16, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: `${user.attendedMeetings || 0}/${user.totalMeetings || 0}`, size: 18 })],
                        alignment: AlignmentType.CENTER
                      })],
                      shading: { fill: isEven ? 'F5F5F5' : 'FFFFFF' },
                      width: { size: 14, type: WidthType.PERCENTAGE }
                    }),
                    new TableCell({
                      children: [new Paragraph({ 
                        children: [new TextRun({ text: `${user.attendanceRate || 0}%`, size: 18 })],
                        alignment: AlignmentType.CENTER
                      })],
                      shading: { fill: isEven ? 'F5F5F5' : 'FFFFFF' },
                      width: { size: 13, type: WidthType.PERCENTAGE }
                    })
                  ]
                });
              })
            ]
          }),
          // Footer - LARGER
          new Paragraph({
            children: [
              new TextRun({
                text: `Report generated by ZUCA Portal | © ${new Date().getFullYear()} ZUCA - All Rights Reserved`,
                size: 18,        // Increased from 16
                color: '999999',
                font: 'Arial'
              })
            ],
            alignment: AlignmentType.CENTER,
            spacing: { before: 300 }
          })
        ]
      }]
    });

    const blob = await Packer.toBlob(doc);
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance_report_${new Date().toISOString().split('T')[0]}.docx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    
  } catch (error) {
    console.error('Word export error:', error);
    alert('Failed to export Word document. Please try again.');
  } finally {
    setExporting(false);
    setShowExportMenu(false);
  }
};

  // Export to CSV
  const exportToCSV = async () => {
    try {
      setExporting(true);
      const params = new URLSearchParams({
        format: 'csv',
        ...filters
      });
      
      const response = await axios.get(
        `${BASE_URL}/api/attendance/admin/export-attendance?${params}`,
        { 
          headers: getHeaders(),
          responseType: 'blob'
        }
      );
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `attendance_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
    } catch (error) {
      console.error('CSV export error:', error);
      alert('Failed to export CSV. Please try again.');
    } finally {
      setExporting(false);
      setShowExportMenu(false);
    }
  };

  const toggleRowExpand = (userId) => {
    const newExpanded = new Set(expandedRows);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedRows(newExpanded);
  };

  const getRoleBadge = (user) => {
    if (user.executivePosition) {
      return <span className="badge executive"> {user.executivePosition}</span>;
    }
    if (user.role === 'admin') {
      return <span className="badge admin">Admin</span>;
    }
    if (user.role === 'secretary' || user.specialRole === 'secretary') {
      return <span className="badge secretary">Secretary</span>;
    }
    if (user.specialRole) {
      return <span className="badge special">{user.specialRole}</span>;
    }
    return <span className="badge member">Member</span>;
  };

  const getAttendanceColor = (rate) => {
    if (rate >= 80) return '#10b981';
    if (rate >= 50) return '#f59e0b';
    return '#ef4444';
  };

  const getAttendanceLabel = (rate) => {
    if (rate >= 80) return 'Excellent';
    if (rate >= 60) return 'Good';
    if (rate >= 40) return 'Fair';
    return 'Needs Improvement';
  };

  return (
    <div className="admin-attendance-page">
      {/* Header */}
      <div className="page-header">
       <div className="header-left">
  <button className="back-btn" onClick={() => navigate(-1)}>
    <ArrowLeft size={20} /> Back
  </button>
  <div>
    <h1><FaUsers /> Attendance Management</h1>
    <p className="subtitle">Attendance records for all ZUCA members</p>
    {currentSemester && (
      <div className="semester-info">
        <span className="semester-label"><FaCalendar /> Current Semester:</span>
        <span className="semester-name">{currentSemester.period?.display || currentSemester.title}</span>
        <button 
          className="semester-manage-btn"
          onClick={() => setShowSemesterManagement(!showSemesterManagement)}
        >
          ⚙️ Manage
        </button>
      </div>
    )}
  </div>
</div>
      <div className="header-actions">
  {/* Semester Dropdown */}
  <div className="semester-filter">
    <select 
      value={selectedSemester} 
      onChange={(e) => handleSemesterChange(e.target.value)}
      className="semester-select"
    >
      <option value="current">Current Semester</option>
      <option value="all">All Time</option>
      {semesters.map(sem => (
        <option key={sem.id} value={sem.id}>
          {sem.period?.display || sem.title}
          {sem.isCurrent && ' (Current)'}
        </option>
      ))}
    </select>
  </div>

  {/* Send Reports Button */}
  {currentSemester && (
    <button 
      className="send-reports-btn" 
      onClick={handleSendReports}
      disabled={sendingReports}
      title={`Send reports for ${currentSemester.title}`}
    >
      <Mail size={16} />
      {sendingReports ? 'Sending...' : 'Send Reports'}
    </button>
  )}

  {/* Export Dropdown */}
  <div className="export-dropdown">
    <button 
      className="export-btn main" 
      onClick={() => setShowExportMenu(!showExportMenu)}
      disabled={exporting}
    >
      <Download size={16} />
      {exporting ? 'Exporting...' : 'Export'}
      <ChevronDown size={16} />
    </button>
    {showExportMenu && (
      <div className="export-menu">
        <button onClick={exportToPDF} disabled={exporting}>
          <FileText size={14} /> Export as PDF
        </button>
        <button onClick={exportToWord} disabled={exporting}>
          <FileText size={14} /> Export as Word
        </button>
        <button onClick={exportToCSV} disabled={exporting}>
          <FileText size={14} /> Export as CSV
        </button>
      </div>
    )}
  </div>
</div>
      </div>

       {/* ✅ SEMESTER MANAGEMENT PANEL - ADD THIS HERE */}
      {showSemesterManagement && (
        <div className="semester-management-panel">
          <div className="panel-header">
            <h3>🔧 Semester Management</h3>
            <button className="panel-close" onClick={() => setShowSemesterManagement(false)}>✕</button>
          </div>
          
          <div className="panel-body">
            {/* Current Semester */}
            <div className="semester-status">
              <div className="status-label">Current Active Semester:</div>
              {currentSemester ? (
                <div className="current-semester-box">
                  <span className="semester-title"> {currentSemester.title}</span>
                  <span className="semester-date">{currentSemester.period?.display || ''}</span>
                  <button 
                    className="deactivate-btn"
                    onClick={handleDeactivateSemester}
                    disabled={activatingSemester}
                  >
                    {activatingSemester ? 'Processing...' : 'Deactivate'}
                  </button>
                </div>
              ) : (
                <div className="no-semester">❌ No active semester</div>
              )}
            </div>

            {/* All Semesters */}
            <div className="all-semesters">
              <div className="section-label">All Semesters:</div>
              <div className="semester-list">
                {semesters.length === 0 ? (
                  <div className="no-semesters">No semesters found. Create a schedule with semester dates first.</div>
                ) : (
                  semesters.map(sem => (
                    <div key={sem.id} className={`semester-item ${sem.isCurrent ? 'active' : ''}`}>
                      <div className="semester-info">
                        <span className="semester-title">{sem.title}</span>
                        <span className="semester-date">{sem.period?.display || ''}</span>
                        {sem.isCurrent && <span className="current-badge"> Active</span>}
                      </div>
                      <div className="semester-actions">
                        {!sem.isCurrent && (
                          <button 
                            className="activate-btn"
                            onClick={() => handleActivateSemester(sem.id, sem.title)}
                            disabled={activatingSemester}
                          >
                            {activatingSemester ? '...' : 'Activate'}
                          </button>
                        )}
                        {sem.isCurrent && (
                          <span className="current-label">Current</span>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="filters-section">
        <div className="filter-row">
          <div className="filter-group search-group">
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by name, membership #, or email..."
              value={filters.search}
              onChange={(e) => handleFilterChange('search', e.target.value)}
            />
          </div>
          
          <div className="filter-group">
            <label>Role</label>
            <select
              value={filters.role}
              onChange={(e) => handleFilterChange('role', e.target.value)}
            >
              <option value="all">All Members</option>
              <option value="executive"> Executive Team</option>
              <option value="member">👤 Regular Members</option>
            </select>
          </div>
          
          <div className="filter-group">
            <label>Jumuia</label>
            <select
              value={filters.jumuiaId}
              onChange={(e) => handleFilterChange('jumuiaId', e.target.value)}
            >
              <option value="all">All Jumuia</option>
              {filterOptions.jumuias.map(j => (
                <option key={j.id} value={j.id}>{j.name}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="filter-row">
          <div className="filter-group date-group">
            <label>From:</label>
            <input
              type="date"
              value={filters.fromDate}
              onChange={(e) => handleFilterChange('fromDate', e.target.value)}
            />
          </div>
          <div className="filter-group date-group">
            <label>To:</label>
            <input
              type="date"
              value={filters.toDate}
              onChange={(e) => handleFilterChange('toDate', e.target.value)}
            />
          </div>
          <button className="clear-filters" onClick={() => {
            setFilters({
              search: '',
              role: 'all',
              jumuiaId: 'all',
              fromDate: '',
              toDate: '',
              sortBy: 'fullName',
              sortOrder: 'asc'
            });
            setPagination(prev => ({ ...prev, page: 1 }));
          }}>
            Clear Filters
          </button>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="stats-summary">
        <div className="stat-item">
          <div className="stat-icon users">
            <Users size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">{pagination.total}</span>
            <span className="stat-label">Total Members</span>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon high">
            <BarChart3 size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {users.filter(u => u.attendanceRate >= 80).length}
            </span>
            <span className="stat-label">High Attendance (&gt;80%)</span>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon executive">
            <User size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {users.filter(u => u.executivePosition).length}
            </span>
            <span className="stat-label">Executive Members</span>
          </div>
        </div>
        <div className="stat-item">
          <div className="stat-icon total">
            <Award size={24} />
          </div>
          <div className="stat-content">
            <span className="stat-value">
              {users.reduce((sum, u) => sum + (u.attendedMeetings || 0), 0)}
            </span>
            <span className="stat-label">Total Check-ins</span>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="table-container">
        {loading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading attendance data...</p>
          </div>
        ) : users.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📋</div>
            <h3>No Members Found</h3>
            <p>Try adjusting your filters or search criteria.</p>
          </div>
        ) : (
          <table className="users-table">
            <thead>
              <tr>
                <th style={{ width: '50px' }}>#</th>
                <th>Member</th>
                <th>Membership</th>
                <th>Role</th>
                <th>Jumuia</th>
                <th>Attended / Total</th>
                <th>Attendance Rate</th>
                <th style={{ width: '120px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user, index) => (
                <React.Fragment key={user.id}>
                  <tr className={expandedRows.has(user.id) ? 'expanded' : ''}>
                    <td>{index + 1 + (pagination.page - 1) * pagination.limit}</td>
                    <td className="user-name-cell">
                      <div className="user-name-wrapper">
                        <span className="user-name">{user.fullName}</span>
                        {user.executivePosition && (
                          <span className="executive-badge"></span>
                        )}
                      </div>
                    </td>
                    <td>{user.membership_number || 'N/A'}</td>
                    <td>{getRoleBadge(user)}</td>
                    <td>{user.homeJumuia?.name || 'N/A'}</td>
                    <td className="checkins-cell">
                      <div className="checkins-info">
                        <span className="checkins-attended">{user.attendedMeetings || 0}</span>
                        <span className="checkins-separator">/</span>
                        <span className="checkins-total">{user.totalMeetings || 0}</span>
                      </div>
                      {user.missedMeetings > 0 && (
                        <span className="missed-badge">-{user.missedMeetings} missed</span>
                      )}
                    </td>
                    <td>
                      <div className="rate-cell">
                        <div className="rate-bar">
                          <div 
                            className="rate-fill" 
                            style={{ 
                              width: `${Math.min(user.attendanceRate || 0, 100)}%`,
                              background: getAttendanceColor(user.attendanceRate || 0)
                            }}
                          />
                        </div>
                        <span className="rate-value">{user.attendanceRate || 0}%</span>
                        <span className="rate-label">{getAttendanceLabel(user.attendanceRate || 0)}</span>
                      </div>
                    </td>
                    <td>
                      <div className="action-buttons">
                        <button 
                          className="view-btn"
                          onClick={() => handleViewUser(user.id)}
                          title="View detailed history"
                        >
                          <Eye size={16} />
                        </button>
                        <button 
                          className="expand-btn"
                          onClick={() => toggleRowExpand(user.id)}
                          title="Toggle recent attendance"
                        >
                          {expandedRows.has(user.id) ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </button>
                      </div>
                    </td>
                  </tr>
                  {expandedRows.has(user.id) && (
                    <tr className="expand-row">
                      <td colSpan="8">
                        <div className="expand-content">
                          <div className="recent-attendance">
                            <h4>Recent Attendance</h4>
                            {user.recentAttendances && user.recentAttendances.length > 0 ? (
                              <div className="recent-grid">
                                {user.recentAttendances.map((att, idx) => (
                                  <div key={idx} className="recent-item">
                                    <span className="recent-title">{att.title}</span>
                                    <span className="recent-date">
                                      <Calendar size={12} /> {new Date(att.date).toLocaleDateString()}
                                    </span>
                                    <span className={`recent-method ${att.method?.toLowerCase()}`}>
                                      {att.method}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <p className="no-recent">No recent attendance records</p>
                            )}
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        )}

        {/* Pagination */}
        {users.length > 0 && (
          <div className="pagination">
            <button
              onClick={() => handlePageChange(pagination.page - 1)}
              disabled={pagination.page === 1}
            >
              Previous
            </button>
            <span className="pagination-info">
              Page {pagination.page} of {pagination.totalPages}
              <span className="pagination-total">({pagination.total} total members)</span>
            </span>
            <button
              onClick={() => handlePageChange(pagination.page + 1)}
              disabled={pagination.page === pagination.totalPages}
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* User Detail Modal - Keep the same */}
      {showUserModal && selectedUser && (
        <div className="modal-overlay" onClick={() => setShowUserModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div className="modal-user-info">
                <h2>{selectedUser.user.fullName}</h2>
                {selectedUser.user.executivePosition && (
                  <span className="modal-executive-badge"> {selectedUser.user.executivePosition}</span>
                )}
              </div>
              <button className="modal-close" onClick={() => setShowUserModal(false)}>×</button>
            </div>
            
            <div className="modal-body">
              <div className="user-info-grid">
                <div className="info-item">
                  <label>Membership #</label>
                  <span>{selectedUser.user.membershipNumber || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Email</label>
                  <span>{selectedUser.user.email || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Phone</label>
                  <span>{selectedUser.user.phone || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Jumuia</label>
                  <span>{selectedUser.user.jumuiaName || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Role</label>
                  <span>{selectedUser.user.role || 'N/A'}</span>
                </div>
                <div className="info-item">
                  <label>Special Role</label>
                  <span>{selectedUser.user.specialRole || 'N/A'}</span>
                </div>
              </div>

              <div className="stats-grid">
                <div className="stat-box">
                  <span className="stat-number">{selectedUser.stats.totalMeetings}</span>
                  <span className="stat-label">Total Meetings</span>
                </div>
                <div className="stat-box present">
                  <span className="stat-number">{selectedUser.stats.attendedMeetings}</span>
                  <span className="stat-label">✅ Attended</span>
                </div>
                <div className="stat-box missed">
                  <span className="stat-number">{selectedUser.stats.missedMeetings}</span>
                  <span className="stat-label">❌ Missed</span>
                </div>
                <div className="stat-box rate">
                  <span className="stat-number">{selectedUser.stats.attendanceRate}%</span>
                  <span className="stat-label">📊 Attendance Rate</span>
                </div>
              </div>

              {/* Attendance History */}
              <div className="history-section">
                <h3>📝 Attendance History</h3>
                <div className="history-list">
                  {selectedUser.attendanceHistory && selectedUser.attendanceHistory.length > 0 ? (
                    selectedUser.attendanceHistory.map(entry => (
                      <div key={entry.id} className="history-item">
                        <div className="history-title">{entry.sheetTitle}</div>
                        <div className="history-details">
                          <span><Calendar size={14} /> {new Date(entry.eventDate).toLocaleDateString()}</span>
                          {entry.eventTime && <span><Clock size={14} /> {entry.eventTime}</span>}
                          <span><MapPin size={14} /> {entry.location || 'ZUCA'}</span>
                          <span className={`history-method ${entry.signMethod?.toLowerCase()}`}>
                            {entry.signMethod}
                          </span>
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="no-history">No attendance records found</p>
                  )}
                </div>
              </div>


            </div>
          </div>
        </div>
      )}

      <style>{`
        /* Keep all existing styles and add these new ones */
        .export-dropdown {
          position: relative;
          display: inline-block;
        }
        .export-btn.main {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #1e293b;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .export-btn.main:hover:not(:disabled) {
          background: #0f172a;
          transform: translateY(-1px);
        }
        .export-btn.main:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .export-menu {
          position: absolute;
          top: 100%;
          right: 0;
          margin-top: 4px;
          background: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
          min-width: 180px;
          z-index: 100;
          overflow: hidden;
        }
        .export-menu button {
          display: flex;
          align-items: center;
          gap: 10px;
          width: 100%;
          padding: 10px 16px;
          border: none;
          background: white;
          cursor: pointer;
          font-size: 13px;
          color: #1e293b;
          transition: background 0.2s;
          text-align: left;
        }
        .export-menu button:hover {
          background: #f1f5f9;
        }
        .export-menu button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        

        .admin-attendance-page {
          padding: 24px;
          background: #f5f7fa;
          min-height: 100vh;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 16px;
        }
        .header-left {
          display: flex;
          align-items: center;
          gap: 16px;
        }
        .header-left h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
        }
        .subtitle {
          color: #64748b;
          font-size: 14px;
          margin: 4px 0 0;
        }
        .back-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 16px;
          background: white;
          border: 1px solid #e2e8f0;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .back-btn:hover {
          background: #f8fafc;
          transform: translateX(-2px);
        }
        .header-actions {
          display: flex;
          gap: 12px;
        }
        .export-btn {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 10px 20px;
          background: #1e293b;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
          font-weight: 500;
          transition: all 0.2s;
        }
        .export-btn:hover:not(:disabled) {
          background: #0f172a;
          transform: translateY(-1px);
        }
        .export-btn.json {
          background: #3b82f6;
        }
        .export-btn.json:hover:not(:disabled) {
          background: #2563eb;
        }
        .export-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .filters-section {
          background: white;
          padding: 20px;
          border-radius: 12px;
          margin-bottom: 20px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .filter-row {
          display: flex;
          gap: 16px;
          margin-bottom: 12px;
          flex-wrap: wrap;
        }
        .filter-row:last-child {
          margin-bottom: 0;
        }
        .filter-group {
          display: flex;
          align-items: center;
          gap: 8px;
          flex: 1;
          min-width: 200px;
        }
        .filter-group label {
          font-size: 13px;
          color: #475569;
          font-weight: 500;
          white-space: nowrap;
        }
        .filter-group input,
        .filter-group select {
          flex: 1;
          padding: 8px 12px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          font-size: 14px;
          background: white;
        }
        .filter-group input:focus,
        .filter-group select:focus {
          outline: none;
          border-color: #3b82f6;
          box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
        }
        .search-group {
          flex: 2;
        }
        .date-group {
          flex: 0.5;
          min-width: 150px;
        }
        .clear-filters {
          padding: 8px 16px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          cursor: pointer;
          font-size: 13px;
          transition: all 0.2s;
        }
        .clear-filters:hover {
          background: #e2e8f0;
        }
        .stats-summary {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 20px;
        }
        .stat-item {
          background: white;
          padding: 16px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          gap: 16px;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .stat-icon {
          width: 48px;
          height: 48px;
          border-radius: 12px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .stat-icon.users { background: #dbeafe00; color: #000000; }
        .stat-icon.high { background: #00000000; color: #000000; }
        .stat-icon.executive { background: #fef3c700; color: #000000e5; }
        .stat-icon.total { background: #00000000; color: #000000; }
        .stat-content {
          display: flex;
          flex-direction: column;
        }
        .stat-content .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #1e293b;
        }
        .stat-content .stat-label {
          font-size: 13px;
          color: #64748b;
        }
        .table-container {
          background: white;
          border-radius: 12px;
          padding: 20px;
          overflow-x: auto;
          box-shadow: 0 1px 3px rgba(0,0,0,0.05);
        }
        .users-table {
          width: 100%;
          border-collapse: collapse;
        }
        .users-table th {
          text-align: left;
          padding: 12px 8px;
          border-bottom: 2px solid #e2e8f0;
          font-weight: 600;
          font-size: 12px;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }
        .users-table td {
          padding: 12px 8px;
          border-bottom: 1px solid #f1f5f9;
        }
        .users-table tr:hover td {
          background: #f8fafc;
        }
        .users-table tr.expanded td {
          background: #f0f9ff;
        }
        .user-name-cell {
          font-weight: 500;
        }
        .user-name-wrapper {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .executive-badge {
          font-size: 16px;
        }
        .badge {
          padding: 4px 10px;
          border-radius: 20px;
          font-size: 11px;
          font-weight: 500;
          display: inline-block;
        }
        .badge.executive {
          background: #dbeafe;
          color: #2563eb;
        }
        .badge.admin {
          background: #fef3c7;
          color: #d97706;
        }
        .badge.secretary {
          background: #dcfce7;
          color: #059669;
        }
        .badge.special {
          background: #fce7f3;
          color: #db2777;
        }
        .badge.member {
          background: #f1f5f9;
          color: #475569;
        }
        .checkins-cell {
          font-weight: 600;
          font-size: 16px;
        }
        .rate-cell {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .rate-bar {
          width: 80px;
          height: 6px;
          background: #e2e8f0;
          border-radius: 4px;
          overflow: hidden;
        }
        .rate-fill {
          height: 100%;
          border-radius: 4px;
          transition: width 0.3s;
        }
        .rate-value {
          font-weight: 600;
          font-size: 14px;
          min-width: 40px;
        }
        .rate-label {
          font-size: 10px;
          color: #64748b;
          background: #f1f5f9;
          padding: 2px 8px;
          border-radius: 12px;
        }
        .action-buttons {
          display: flex;
          gap: 6px;
        }
        .view-btn, .expand-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          width: 32px;
          height: 32px;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          background: white;
          cursor: pointer;
          transition: all 0.2s;
        }
        .view-btn {
          color: #3b82f6;
        }
        .view-btn:hover {
          background: #dbeafe;
          border-color: #3b82f6;
        }
        .expand-btn {
          color: #64748b;
        }
        .expand-btn:hover {
          background: #f1f5f9;
        }
        .expand-row td {
          padding: 0 !important;
          background: #f8fafc !important;
        }
        .expand-content {
          padding: 16px 24px;
        }
        .recent-attendance h4 {
          margin: 0 0 12px 0;
          font-size: 14px;
          color: #475569;
        }
        .recent-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
          gap: 8px;
        }
        .recent-item {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 8px 12px;
          background: white;
          border-radius: 6px;
          border: 1px solid #e2e8f0;
          font-size: 13px;
        }
        .recent-title {
          flex: 1;
          font-weight: 500;
        }
        .recent-date {
          font-size: 11px;
          color: #64748b;
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .recent-method {
          font-size: 10px;
          padding: 2px 8px;
          border-radius: 12px;
          font-weight: 500;
        }
        .recent-method.self { background: #dbeafe; color: #2563eb; }
        .recent-method.qr_code { background: #dcfce7; color: #059669; }
        .recent-method.manual { background: #fef3c7; color: #d97706; }
        .recent-method.wifi_auto { background: #ede9fe; color: #7c3aed; }
        .no-recent {
          color: #64748b;
          font-size: 13px;
          margin: 0;
        }
        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 20px;
          padding-top: 16px;
          border-top: 1px solid #e2e8f0;
        }
        .pagination button {
          padding: 8px 16px;
          background: #f1f5f9;
          border: 1px solid #e2e8f0;
          border-radius: 6px;
          cursor: pointer;
          transition: all 0.2s;
        }
        .pagination button:hover:not(:disabled) {
          background: #e2e8f0;
        }
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        .pagination-info {
          font-size: 14px;
          color: #475569;
        }
        .pagination-total {
          font-size: 12px;
          color: #94a3b8;
          margin-left: 8px;
        }
        .loading-state {
          text-align: center;
          padding: 60px;
          color: #64748b;
        }
        .spinner {
          border: 3px solid #e2e8f0;
          border-top: 3px solid #3b82f6;
          border-radius: 50%;
          width: 40px;
          height: 40px;
          animation: spin 1s linear infinite;
          margin: 0 auto 16px;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        .empty-state {
          text-align: center;
          padding: 60px 20px;
        }
        .empty-icon {
          font-size: 64px;
          margin-bottom: 16px;
        }
        .empty-state h3 {
          margin-bottom: 8px;
        }
        .empty-state p {
          color: #64748b;
        }
        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0,0,0,0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
          padding: 20px;
        }
        .modal-content {
          background: white;
          border-radius: 16px;
          max-width: 800px;
          max-height: 90vh;
          overflow-y: auto;
          padding: 24px;
          width: 100%;
          animation: modalSlideIn 0.3s ease;
        }
        @keyframes modalSlideIn {
          from {
            transform: translateY(-20px);
            opacity: 0;
          }
          to {
            transform: translateY(0);
            opacity: 1;
          }
        }
        .modal-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 20px;
          padding-bottom: 16px;
          border-bottom: 1px solid #e2e8f0;
        }
        .modal-user-info {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .modal-user-info h2 {
          margin: 0;
          font-size: 20px;
        }
        .modal-executive-badge {
          background: #dbeafe;
          color: #2563eb;
          padding: 4px 12px;
          border-radius: 20px;
          font-size: 12px;
          font-weight: 500;
        }
        .modal-close {
          font-size: 28px;
          background: none;
          border: none;
          cursor: pointer;
          color: #64748b;
          transition: all 0.2s;
          line-height: 1;
        }
        .modal-close:hover {
          color: #1e293b;
        }
        .user-info-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
          margin-bottom: 20px;
        }
        .info-item {
          display: flex;
          flex-direction: column;
        }
        .info-item label {
          font-size: 11px;
          color: #94a3b8;
          text-transform: uppercase;
          font-weight: 600;
          letter-spacing: 0.5px;
        }
        .info-item span {
          font-weight: 500;
          font-size: 14px;
          margin-top: 2px;
        }
        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 12px;
          margin-bottom: 24px;
        }
        .stat-box {
          background: #f8fafc;
          padding: 12px;
          border-radius: 8px;
          text-align: center;
        }
        .stat-box .stat-number {
          display: block;
          font-size: 24px;
          font-weight: 700;
        }
        .stat-box .stat-label {
          font-size: 12px;
          color: #64748b;
        }
        .stat-box.present .stat-number { color: #059669; }
        .stat-box.missed .stat-number { color: #dc2626; }
        .stat-box.rate .stat-number { color: #3b82f6; }
        .history-section, .missed-section {
          margin-bottom: 20px;
        }
        .history-section h3, .missed-section h3 {
          font-size: 16px;
          font-weight: 600;
          margin-bottom: 12px;
        }
        .history-list, .missed-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }
        .history-item, .missed-item {
          padding: 12px;
          background: #f8fafc;
          border-radius: 8px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          flex-wrap: wrap;
          gap: 8px;
        }
        .history-title {
          font-weight: 500;
          flex: 1;
        }
        .history-details {
          display: flex;
          align-items: center;
          gap: 16px;
          font-size: 13px;
          color: #64748b;
          flex-wrap: wrap;
        }
        .history-details span {
          display: flex;
          align-items: center;
          gap: 4px;
        }
        .history-method {
          padding: 2px 10px;
          border-radius: 12px;
          font-size: 11px;
          font-weight: 500;
        }
        .history-method.self { background: #dbeafe; color: #2563eb; }
        .history-method.qr_code { background: #dcfce7; color: #059669; }
        .history-method.manual { background: #fef3c7; color: #d97706; }
        .history-method.wifi_auto { background: #ede9fe; color: #7c3aed; }
        .missed-item {
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .missed-title {
          font-weight: 500;
        }
        .missed-date {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 13px;
          color: #64748b;
        }
        .no-history {
          color: #64748b;
          text-align: center;
          padding: 20px;
        }
        @media (max-width: 768px) {
          .admin-attendance-page {
            padding: 12px;
          }
          .page-header {
            flex-direction: column;
            align-items: stretch;
          }
          .header-left {
            flex-wrap: wrap;
          }
          .header-actions {
            flex-direction: column;
          }
          .filter-row {
            flex-direction: column;
          }
          .filter-group {
            min-width: 100%;
          }
          .date-group {
            flex: 1;
            min-width: 100%;
          }
          .stats-summary {
            grid-template-columns: 1fr 1fr;
          }
          .user-info-grid {
            grid-template-columns: 1fr 1fr;
          }
          .stats-grid {
            grid-template-columns: 1fr 1fr;
          }
          .history-item {
            flex-direction: column;
            align-items: flex-start;
          }
          .history-details {
            flex-wrap: wrap;
          }
          .modal-content {
            padding: 16px;
            margin: 10px;
          }
        }

        .semester-filter {
  display: flex;
  align-items: center;
  gap: 8px;
}

.semester-select {
  padding: 8px 16px;
  border: 1px solid #e2e8f0;
  border-radius: 8px;
  font-size: 14px;
  background: white;
  color: #1e293b;
  cursor: pointer;
  min-width: 180px;
  transition: all 0.2s;
}

.semester-select:hover {
  border-color: #94a3b8;
}

.semester-select:focus {
  outline: none;
  border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.send-reports-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: #10b981;
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  font-weight: 500;
  transition: all 0.2s;
  white-space: nowrap;
}

.send-reports-btn:hover:not(:disabled) {
  background: #059669;
  transform: translateY(-1px);
  box-shadow: 0 4px 12px rgba(16, 185, 129, 0.3);
}

.send-reports-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.send-reports-btn svg {
  flex-shrink: 0;
}

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

@media (max-width: 768px) {
  .header-actions {
    flex-direction: column;
    align-items: stretch;
    width: 100%;
  }
  
  .semester-filter {
    width: 100%;
  }
  
  .semester-select {
    width: 100%;
    min-width: unset;
  }
  
  .send-reports-btn {
    justify-content: center;
    width: 100%;
  }
}

/* Semester Management Panel */
.semester-management-panel {
  background: white;
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 20px;
  border: 1px solid #e2e8f0;
  box-shadow: 0 4px 12px rgba(0,0,0,0.05);
}

.panel-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16px;
  padding-bottom: 12px;
  border-bottom: 1px solid #e2e8f0;
}

.panel-header h3 {
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  color: #1e293b;
}

.panel-close {
  background: none;
  border: none;
  font-size: 20px;
  cursor: pointer;
  color: #94a3b8;
}

.panel-close:hover {
  color: #1e293b;
}

.semester-status {
  margin-bottom: 20px;
  padding: 16px;
  background: #f8fafc;
  border-radius: 8px;
}

.status-label {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 8px;
}

.current-semester-box {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
  padding: 12px;
  background: #f0fdf4;
  border-radius: 8px;
  border: 1px solid #bbf7d0;
}

.current-semester-box .semester-title {
  font-weight: 600;
  color: #065f46;
}

.current-semester-box .semester-date {
  font-size: 13px;
  color: #64748b;
}

.deactivate-btn {
  padding: 4px 12px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.deactivate-btn:hover:not(:disabled) {
  background: #dc2626;
}

.deactivate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.no-semester {
  padding: 12px;
  background: #fef2f2;
  border-radius: 8px;
  border: 1px solid #fecaca;
  color: #dc2626;
}

.section-label {
  font-size: 13px;
  font-weight: 500;
  color: #64748b;
  margin-bottom: 12px;
}

.semester-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 300px;
  overflow-y: auto;
}

.semester-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: #f8fafc;
  border-radius: 8px;
  border: 1px solid #e2e8f0;
  transition: all 0.2s;
}

.semester-item:hover {
  background: #f1f5f9;
}

.semester-item.active {
  background: #f0fdf4;
  border-color: #bbf7d0;
}

.semester-info {
  display: flex;
  align-items: center;
  gap: 12px;
  flex-wrap: wrap;
}

.semester-info .semester-title {
  font-weight: 500;
  color: #1e293b;
}

.semester-info .semester-date {
  font-size: 13px;
  color: #64748b;
}

.current-badge {
  font-size: 11px;
  background: #10b981;
  color: white;
  padding: 2px 10px;
  border-radius: 12px;
  font-weight: 500;
}

.activate-btn {
  padding: 4px 12px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
}

.activate-btn:hover:not(:disabled) {
  background: #2563eb;
}

.activate-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.current-label {
  font-size: 12px;
  color: #10b981;
  font-weight: 600;
}

.no-semesters {
  padding: 20px;
  text-align: center;
  color: #94a3b8;
}

.semester-manage-btn {
  background: none;
  border: none;
  color: #3b82f6;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  padding: 2px 8px;
  border-radius: 4px;
}

.semester-manage-btn:hover {
  background: #eff6ff;
}

.semester-info {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 4px;
  font-size: 13px;
  color: #475569;
  flex-wrap: wrap;
}

.semester-label {
  font-weight: 500;
  color: #64748b;
}

.semester-name {
  font-weight: 600;
  color: #1e293b;
  background: #eff6ff;
  padding: 2px 12px;
  border-radius: 11px;
  border: 1px solid #dbeafe;
}
      `}</style>
    </div>
  );
}