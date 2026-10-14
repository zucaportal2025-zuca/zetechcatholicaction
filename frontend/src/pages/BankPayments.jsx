import React, { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import axios from "axios";
import BASE_URL from "../api";
import { FaCircleNotch, FaExclamationCircle, FaFileCsv, FaFilePdf, FaFileWord, FaPaypal, FaRegTimesCircle, FaUnlock } from "react-icons/fa";
import { FiPlusCircle } from "react-icons/fi";

function BankPayments() {
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({
    status: "all",
    search: "",
    fromDate: "",
    toDate: "",
    page: 1,
    limit: 50,
  });
  const [selectedPayment, setSelectedPayment] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [expandingId, setExpandingId] = useState(null);
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignData, setAssignData] = useState({ userId: "", contributionTypeId: "" });
  const [users, setUsers] = useState([]);
  const [campaigns, setCampaigns] = useState([]);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState({ show: false, message: "", type: "" });

  const token = localStorage.getItem("token");
  const headers = token ? { Authorization: `Bearer ${token}` } : {};

  const showNotification = (message, type = "success") => {
    setNotification({ show: true, message, type });
    setTimeout(() => setNotification({ show: false, message: "", type: "" }), 3000);
  };

  // Fetch payments
  const fetchPayments = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const params = new URLSearchParams();
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.search) params.append("search", filters.search);
      if (filters.fromDate) params.append("fromDate", filters.fromDate);
      if (filters.toDate) params.append("toDate", filters.toDate);
      params.append("page", filters.page);
      params.append("limit", filters.limit);

      const res = await axios.get(`${BASE_URL}/api/ibm/payments?${params}`, { headers });
      setPayments(res.data.payments || []);
      setStats(res.data.stats || {});
      setPagination(res.data.pagination || {});
    } catch (err) {
      setError(err.response?.data?.error || "Failed to fetch payments");
    } finally {
      setLoading(false);
    }
  }, [filters, headers]);

  // Fetch users and campaigns for assign modal
  const fetchUsersAndCampaigns = useCallback(async () => {
    try {
      const [usersRes, campaignsRes] = await Promise.all([
        axios.get(`${BASE_URL}/api/users/light`, { headers }),
        axios.get(`${BASE_URL}/api/contribution-types`, { headers }),
      ]);
      setUsers(usersRes.data || []);
      setCampaigns(campaignsRes.data || []);
    } catch (err) {
      console.error("Failed to fetch users/campaigns:", err);
    }
  }, [headers]);

  // Fetch payment details when expanding
  const fetchPaymentDetails = async (paymentId) => {
    if (expandedRow === paymentId) {
      setExpandedRow(null);
      setSelectedPayment(null);
      return;
    }

    setExpandingId(paymentId);
    try {
      const res = await axios.get(`${BASE_URL}/api/ibm/payments/${paymentId}`, { headers });
      setSelectedPayment(res.data);
      setExpandedRow(paymentId);
    } catch (err) {
      showNotification(err.response?.data?.error || "Failed to load details", "error");
    } finally {
      setExpandingId(null);
    }
  };

  // Assign payment to user
  const handleAssign = async () => {
    if (!assignData.userId) {
      showNotification("Please select a user", "error");
      return;
    }

    setActionLoading(true);
    try {
      await axios.put(
        `${BASE_URL}/api/ibm/payments/${selectedPayment.payment.id}/assign`,
        assignData,
        { headers }
      );
      showNotification("Payment assigned successfully!", "success");
      setShowAssignModal(false);
      setAssignData({ userId: "", contributionTypeId: "" });
      fetchPayments();
    } catch (err) {
      showNotification(err.response?.data?.error || "Failed to assign", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Mark payment as claimed
  const handleMarkClaimed = async (paymentId, contributionTypeId) => {
    if (!contributionTypeId) {
      showNotification("Please select a campaign", "error");
      return;
    }

    if (!window.confirm("Mark this payment as claimed?")) return;

    setActionLoading(true);
    try {
      await axios.put(
        `${BASE_URL}/api/ibm/payments/${paymentId}/mark-claimed`,
        { contributionTypeId },
        { headers }
      );
      showNotification("Payment marked as claimed!", "success");
      fetchPayments();
    } catch (err) {
      showNotification(err.response?.data?.error || "Failed to mark as claimed", "error");
    } finally {
      setActionLoading(false);
    }
  };

  // Export CSV
  const handleExportCSV = async () => {
    try {
      const params = new URLSearchParams();
      if (filters.status !== "all") params.append("status", filters.status);
      if (filters.fromDate) params.append("fromDate", filters.fromDate);
      if (filters.toDate) params.append("toDate", filters.toDate);

      window.open(`${BASE_URL}/api/ibm/payments/export/csv?${params}`, "_blank");
    } catch (err) {
      showNotification("Failed to export", "error");
    }
  };

// Export PDF (downloads automatically using jsPDF + html2canvas)
const handleExportPDF = async () => {
  try {
    showNotification("Generating PDF...", "info");
    
    // Dynamically import required libraries
    const { default: html2canvas } = await import('html2canvas');
    const { default: jsPDF } = await import('jspdf');
    
    // Build HTML content with styles inline
    const content = document.createElement('div');
    content.style.padding = '20px';
    content.style.fontFamily = 'Arial, sans-serif';
    content.style.background = 'white';
    content.style.width = '1000px';
    content.style.maxWidth = '1000px';
    
    // Build the table HTML
    let tableHTML = `
      <h1 style="color: #0f172a; margin-bottom: 8px; font-size: 24px;">ZUCA Bank Payments Report</h1>
      <p style="color: #64748b; margin-bottom: 20px; font-size: 14px;">
        Generated: ${new Date().toLocaleString()} | Total Payments: ${payments.length} | Total Amount: KES ${stats.totalAmount?.toLocaleString() || 0}
      </p>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background: #f1f5f9;">
            <th style="border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-weight: 600;">#</th>
            <th style="border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-weight: 600;">M-PESA Code</th>
            <th style="border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-weight: 600;">Amount</th>
            <th style="border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-weight: 600;">Payer Name</th>
            <th style="border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-weight: 600;">Phone</th>
            <th style="border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-weight: 600;">Date</th>
            <th style="border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-weight: 600;">Status</th>
            <th style="border: 1px solid #e2e8f0; padding: 8px 10px; text-align: left; font-weight: 600;">Claimed By</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    payments.forEach((p, i) => {
      tableHTML += `
        <tr>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px;">${i + 1}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px; font-weight: 600;">${p.mpesaCode}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px;">KES ${p.amount.toLocaleString()}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px;">${p.payerName || '—'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px;">${p.payerPhone || '—'}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px;">${new Date(p.paymentDate).toLocaleDateString()}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px;">${p.status}</td>
          <td style="border: 1px solid #e2e8f0; padding: 6px 10px;">${p.user?.fullName || '—'}</td>
        </tr>
      `;
    });
    
    tableHTML += `
        </tbody>
      </table>
      <div style="margin-top: 20px; padding-top: 20px; border-top: 1px solid #e2e8f0; color: #64748b; font-size: 11px;">
        <p>Report generated by ZUCA Portal</p>
      </div>
    `;
    
    content.innerHTML = tableHTML;
    
    // Append to body temporarily
    document.body.appendChild(content);
    
    // Wait for rendering
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Capture with html2canvas
    const canvas = await html2canvas(content, {
      scale: 2,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: 1000,
    });
    
    // Remove temp element
    document.body.removeChild(content);
    
    // Create PDF
    const pdf = new jsPDF('l', 'mm', 'a4');
    const imgData = canvas.toDataURL('image/jpeg', 0.95);
    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = (canvas.height * pdfWidth) / canvas.width;
    
    pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
    pdf.save(`bank-payments-${new Date().toISOString().split('T')[0]}.pdf`);
    
    showNotification("PDF downloaded successfully!", "success");
  } catch (err) {
    console.error("PDF export error:", err);
    showNotification("Failed to generate PDF. Please try again.", "error");
  }
};

  // Export Word (simple HTML to Word)
  const handleExportWord = () => {
    const tableRows = payments.map(p => `
      <tr>
        <td>${p.mpesaCode}</td>
        <td>${p.amount}</td>
        <td>${p.payerName || '—'}</td>
        <td>${p.payerPhone || '—'}</td>
        <td>${new Date(p.paymentDate).toLocaleDateString()}</td>
        <td>${p.status}</td>
        <td>${p.user?.fullName || '—'}</td>
      </tr>
    `).join('');

    const html = `
      <html xmlns:o='urn:schemas-microsoft-com:office:office' 
            xmlns:w='urn:schemas-microsoft-com:office:word' 
            xmlns='http://www.w3.org/TR/REC-html40'>
      <head>
        <meta charset="utf-8">
        <title>ZUCA Bank Payments Report</title>
        <!--[if gte mso 9]>
        <xml>
          <w:WordDocument>
            <w:View>Print</w:View>
            <w:Zoom>100</w:Zoom>
          </w:WordDocument>
        </xml>
        <![endif]-->
        <style>
          body { font-family: Arial, sans-serif; }
          table { width: 100%; border-collapse: collapse; }
          th, td { border: 1px solid #ccc; padding: 8px; text-align: left; }
          th { background: #f0f0f0; }
          h1 { color: #0f172a; }
        </style>
      </head>
      <body>
        <h1>ZUCA Bank Payments Report</h1>
        <p>Generated: ${new Date().toLocaleString()}</p>
        <table>
          <thead>
            <tr>
              <th>M-PESA Code</th>
              <th>Amount</th>
              <th>Payer Name</th>
              <th>Phone</th>
              <th>Date</th>
              <th>Status</th>
              <th>Claimed By</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
        <p><strong>Total Payments:</strong> ${payments.length}</p>
        <p><strong>Total Amount:</strong> KES ${stats.totalAmount?.toLocaleString() || 0}</p>
      </body>
      </html>
    `;

    const blob = new Blob([html], { type: 'application/msword' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `bank-payments-${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  useEffect(() => {
    if (token) {
      fetchPayments();
      fetchUsersAndCampaigns();
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchPayments();
    }
  }, [filters.page, filters.status, filters.search, filters.fromDate, filters.toDate]);

  const getStatusBadge = (status) => {
    const styles = {
      UNCLAIMED: { bg: "#fee2e2", color: "#991b1b", label: "🔴 UNCLAIMED" },
      AUTO_MATCHED: { bg: "#fef3c7", color: "#92400e", label: "🟡 AUTO-MATCHED" },
      CLAIMED: { bg: "#d1fae5", color: "#065f46", label: "🟢 CLAIMED" },
    };
    const s = styles[status] || styles.UNCLAIMED;
    return (
      <span
        style={{
          background: s.bg,
          color: s.color,
          padding: "4px 12px",
          borderRadius: "20px",
          fontSize: "12px",
          fontWeight: "600",
          display: "inline-block",
        }}
      >
        {s.label}
      </span>
    );
  };

  if (!token) return null;

  return (
    <div className="bank-payments-page">
      {/* Notification */}
      <AnimatePresence>
        {notification.show && (
          <motion.div
            initial={{ x: 300, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 300, opacity: 0 }}
            className={`notification ${notification.type}`}
          >
            {notification.message}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="header">
        <div>
          <h1 className="title"> Bank Payments Dashboard</h1>
          <p className="subtitle">Manage all incoming payments from I&M Bank</p>
        </div>
        <div className="header-actions">
          <button onClick={handleExportCSV} className="export-btn csv"><FaFileCsv size="18px" /> CSV</button>
          <button onClick={handleExportPDF} className="export-btn pdf"> <FaFilePdf size= "18px" />PDF</button>
          <button onClick={handleExportWord} className="export-btn word"><FaFileWord size= "18px" />Word</button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon"><FaPaypal/></div>
          <div className="stat-content">
            <span className="stat-value"> {stats.total || 0}</span>
            <span className="stat-label">-Total Payments</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FiPlusCircle/></div>
          <div className="stat-content">
            <span className="stat-value">{stats.claimed || 0}</span>
            <span className="stat-label">-Claimed</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FaCircleNotch/></div>
          <div className="stat-content">
            <span className="stat-value">{stats.unclaimed || 0}</span>
            <span className="stat-label">Unclaimed</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon"><FaExclamationCircle/></div>
          <div className="stat-content">
            <span className="stat-value">KES {stats.totalAmount?.toLocaleString() || 0}</span>
            <span className="stat-label">Total Amount</span>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="filters">
        <input
          type="text"
          placeholder="🔍 Search by code, name, or phone..."
          className="search-input"
          value={filters.search}
          onChange={(e) => setFilters({ ...filters, search: e.target.value, page: 1 })}
        />
        <select
          className="filter-select"
          value={filters.status}
          onChange={(e) => setFilters({ ...filters, status: e.target.value, page: 1 })}
        >
          <option value="all">All Status</option>
          <option value="UNCLAIMED">Unclaimed</option>
          <option value="AUTO_MATCHED">Auto-Matched</option>
          <option value="CLAIMED">Claimed</option>
        </select>
        <input
          type="date"
          className="filter-date"
          value={filters.fromDate}
          onChange={(e) => setFilters({ ...filters, fromDate: e.target.value, page: 1 })}
        />
        <input
          type="date"
          className="filter-date"
          value={filters.toDate}
          onChange={(e) => setFilters({ ...filters, toDate: e.target.value, page: 1 })}
        />
        <button className="filter-btn" onClick={() => fetchPayments()}>
          Apply Filters
        </button>
        <button
          className="filter-btn reset"
          onClick={() => {
            setFilters({ status: "all", search: "", fromDate: "", toDate: "", page: 1, limit: 50 });
            fetchPayments();
          }}
        >
          Reset
        </button>
      </div>

      {/* Table */}
      {loading ? (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>Loading payments...</p>
        </div>
      ) : error ? (
        <div className="error-state">
          <p>{error}</p>
          <button onClick={fetchPayments}>Retry</button>
        </div>
      ) : payments.length === 0 ? (
        <div className="empty-state">
          <h3>No payments found</h3>
        </div>
      ) : (
        <>
          <div className="table-container">
            <table className="payments-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>M-PESA Code</th>
                  <th>Amount</th>
                  <th>Payer Name</th>
                  <th>Phone</th>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Claimed By</th>
                  <th style={{ textAlign: "center" }}>👁️</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment, index) => (
                  <React.Fragment key={payment.id}>
                    <tr
                      className={expandedRow === payment.id ? "expanded" : ""}
                      onClick={() => fetchPaymentDetails(payment.id)}
                    >
                      <td>{(pagination.page - 1) * pagination.limit + index + 1}</td>
                      <td className="code-cell">{payment.mpesaCode}</td>
                      <td>KES {payment.amount.toLocaleString()}</td>
                      <td>{payment.payerName || "—"}</td>
                      <td>{payment.payerPhone || "—"}</td>
                      <td>{new Date(payment.paymentDate).toLocaleDateString()}</td>
                      <td>{getStatusBadge(payment.status)}</td>
                      <td>{payment.user?.fullName || "—"}</td>
                      <td style={{ textAlign: "center" }}>
                        {expandingId === payment.id ? (
                          <span className="eye-icon loading">⏳</span>
                        ) : (
                          <span className="eye-icon">
                            {expandedRow === payment.id ? "👁️" : "👁️‍🗨️"}
                          </span>
                        )}
                      </td>
                    </tr>

                    {/* Expanded Row */}
                    {expandedRow === payment.id && selectedPayment && (
                      <tr>
                        <td colSpan="9">
                          <div className="expanded-details">
                            <div className="details-grid">
                              {/* Payment Info */}
                              <div className="detail-section">
                                <h4>Payment Information</h4>
                                <p><strong>Code:</strong> {selectedPayment.payment.mpesaCode}</p>
                                <p><strong>Amount:</strong> KES {selectedPayment.payment.amount.toLocaleString()}</p>
                                <p><strong>Date:</strong> {new Date(selectedPayment.payment.paymentDate).toLocaleString()}</p>
                                <p><strong>Type:</strong> {selectedPayment.payment.paymentType || "MPESA"}</p>
                                <p><strong>Phone:</strong> {selectedPayment.payment.payerPhone || "—"}</p>
                                <p><strong>Payer:</strong> {selectedPayment.payment.payerName || "—"}</p>
                                <p><strong>Status:</strong> {getStatusBadge(selectedPayment.payment.status)}</p>
                              </div>

                              {/* User Details */}
                              <div className="detail-section">
                                <h4>User Details</h4>
                                {selectedPayment.payment.user ? (
                                  <>
                                    <div className="user-avatar">
                                      {selectedPayment.payment.user.profileImage ? (
                                        <img
                                          src={selectedPayment.payment.user.profileImage}
                                          alt={selectedPayment.payment.user.fullName}
                                        />
                                      ) : (
                                        <div className="avatar-placeholder">
                                          {selectedPayment.payment.user.fullName?.charAt(0) || "?"}
                                        </div>
                                      )}
                                      <div>
                                        <p><strong>{selectedPayment.payment.user.fullName}</strong></p>
                                        <p>📧 {selectedPayment.payment.user.email || "—"}</p>
                                        <p>📱 {selectedPayment.payment.user.phone || "—"}</p>
                                        <p>🆔 {selectedPayment.payment.user.membership_number || "—"}</p>
                                        <p>👔 {selectedPayment.payment.user.role || "—"}</p>
                                        <p>🏠 {selectedPayment.payment.user.homeJumuia?.name || "—"}</p>
                                      </div>
                                    </div>
                                  </>
                                ) : (
                                  <p>Not assigned</p>
                                )}
                              </div>

                              {/* Campaign & Claim Details */}
                              <div className="detail-section">
                                <h4>Campaign & Claim</h4>
                                {selectedPayment.payment.contributionType ? (
                                  <>
                                    <p><strong>Campaign:</strong> {selectedPayment.payment.contributionType.title}</p>
                                    <p><strong>Target:</strong> KES {selectedPayment.payment.contributionType.amountRequired?.toLocaleString()}</p>
                                    <p><strong>Raised:</strong> KES {selectedPayment.payment.contributionType.collectedAmount?.toLocaleString()}</p>
                                  </>
                                ) : (
                                  <p>Not claimed to any campaign</p>
                                )}
                                {selectedPayment.payment.status === "CLAIMED" && (
                                  <p style={{ color: "#059669", marginTop: "8px" }}>
                                    ✅ Claimed {new Date(selectedPayment.payment.updatedAt).toLocaleString()}
                                  </p>
                                )}
                              </div>

                              {/* Timeline */}
                              {selectedPayment.timeline && selectedPayment.timeline.length > 0 && (
                                <div className="detail-section timeline">
                                  <h4>Timeline</h4>
                                  {selectedPayment.timeline.map((event, i) => (
                                    <div key={i} className="timeline-item">
                                      <span className="timeline-icon">{event.icon}</span>
                                      <span className="timeline-event">{event.event}</span>
                                      <span className="timeline-time">
                                        {new Date(event.timestamp).toLocaleString()}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {/* Actions */}
                              <div className="detail-section actions">
                                <h4>Actions</h4>
                                <div className="action-buttons">
                                  {selectedPayment.payment.status !== "CLAIMED" && (
                                    <>
                                      <button
                                        className="action-btn assign"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setSelectedPayment(selectedPayment);
                                          setShowAssignModal(true);
                                        }}
                                      >
                                        👤 Assign
                                      </button>
                                      <button
                                        className="action-btn claim"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          const campaignId = prompt("Enter campaign ID:");
                                          if (campaignId) {
                                            handleMarkClaimed(selectedPayment.payment.id, campaignId);
                                          }
                                        }}
                                      >
                                        ✅ Mark Claimed
                                      </button>
                                    </>
                                  )}
                                  <button
                                    className="action-btn export"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      alert(`Payment Details:\n\nCode: ${selectedPayment.payment.mpesaCode}\nAmount: KES ${selectedPayment.payment.amount}\nPayer: ${selectedPayment.payment.payerName || "N/A"}\nStatus: ${selectedPayment.payment.status}`);
                                    }}
                                  >
                                    📋 View
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {pagination.totalPages > 1 && (
            <div className="pagination">
              <button
                disabled={pagination.page <= 1}
                onClick={() => setFilters({ ...filters, page: filters.page - 1 })}
              >
                ◀
              </button>
              <span>
                Page {pagination.page} of {pagination.totalPages}
              </span>
              <button
                disabled={pagination.page >= pagination.totalPages}
                onClick={() => setFilters({ ...filters, page: filters.page + 1 })}
              >
                ▶
              </button>
            </div>
          )}
        </>
      )}

      {/* Assign Modal */}
      {showAssignModal && (
        <div className="modal-overlay" onClick={() => setShowAssignModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Assign Payment to User</h3>
            <p>Payment: {selectedPayment?.payment?.mpesaCode} - KES {selectedPayment?.payment?.amount}</p>
            <div className="modal-form">
              <label>User</label>
              <select
                value={assignData.userId}
                onChange={(e) => setAssignData({ ...assignData, userId: e.target.value })}
              >
                <option value="">Select User...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName} ({u.membership_number || "No membership"})
                  </option>
                ))}
              </select>
              <label>Campaign (Optional)</label>
              <select
                value={assignData.contributionTypeId}
                onChange={(e) => setAssignData({ ...assignData, contributionTypeId: e.target.value })}
              >
                <option value="">Select Campaign...</option>
                {campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
              <div className="modal-actions">
                <button className="modal-btn cancel" onClick={() => setShowAssignModal(false)}>
                  Cancel
                </button>
                <button className="modal-btn confirm" onClick={handleAssign} disabled={actionLoading}>
                  {actionLoading ? "Assigning..." : "Assign"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Styles */}
      <style>{`
        .bank-payments-page {
          padding: 40px 20px;
          min-height: 100vh;
          background: #f8fafc;
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
        }

        /* Print styles for PDF */
        @media print {
          .bank-payments-page {
            padding: 20px;
            background: white;
          }
          .export-btn, .filter-btn, .reset, .filters, .pagination, .action-buttons, .modal-overlay {
            display: none !important;
          }
          .eye-icon {
            display: none !important;
          }
          .expanded-details {
            display: none !important;
          }
          .payments-table {
            font-size: 10px;
          }
          .payments-table th, .payments-table td {
            padding: 4px 8px;
          }
        }

        .notification {
          position: fixed;
          top: 70px;
          right: 20px;
          padding: 12px 20px;
          border-radius: 10px;
          color: white;
          font-size: 14px;
          z-index: 9999;
          box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        }
        .notification.success { background: #10b981; }
        .notification.error { background: #ef4444; }

        .header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          margin-bottom: 24px;
          flex-wrap: wrap;
          gap: 12px;
        }
        .title {
          font-size: 28px;
          font-weight: 700;
          color: #0f172a;
          margin: 0;
        }
        .subtitle {
          color: #64748b;
          margin: 4px 0 0 0;
        }
        .header-actions {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .export-btn {
          padding: 10px 16px;
          border: none;
          border-radius: 10px;
          cursor: pointer;
          font-weight: 600;
          font-size: 13px;
          transition: all 0.2s;
        }
        .export-btn.csv { background: #0f172ac2; color: white; }
        .export-btn.pdf { background: #000000b6; color: white; }
        .export-btn.word { background: #000000b9; color: white; }
        .export-btn:hover { transform: translateY(-2px); }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 16px;
          margin-bottom: 24px;
        }
        @media (max-width: 768px) {
          .stats-grid { grid-template-columns: repeat(2, 1fr); }
        }
        @media (max-width: 480px) {
          .stats-grid { grid-template-columns: 1fr 1fr; gap: 10px; }
          .stat-card { padding: 12px; }
          .stat-value { font-size: 18px; }
          .stat-icon { font-size: 22px; }
        }
        .stat-card {
          background: white;
          border-radius: 16px;
          padding: 16px 20px;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        .stat-icon { font-size: 28px; }
        .stat-content { flex: 1; }
        .stat-value {
          font-size: 24px;
          font-weight: 700;
          color: #0f172a;
          line-height: 1.2;
        }
        .stat-label {
          font-size: 12px;
          color: #64748b;
        }

        .filters {
          display: flex;
          flex-wrap: wrap;
          gap: 10px;
          margin-bottom: 24px;
          background: white;
          padding: 16px;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
        }
        @media (max-width: 480px) {
          .filters { flex-direction: column; }
          .search-input { min-width: 100%; }
          .filter-select, .filter-date { width: 100%; }
        }
        .search-input {
          flex: 1;
          min-width: 200px;
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
        }
        .filter-select, .filter-date {
          padding: 10px 14px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
        }
        .filter-btn {
          padding: 10px 20px;
          background: #0f172a;
          color: white;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .filter-btn.reset {
          background: #e2e8f0;
          color: #0f172a;
        }

        .table-container {
          background: white;
          border-radius: 12px;
          overflow: hidden;
          box-shadow: 0 2px 8px rgba(0,0,0,0.05);
          overflow-x: auto;
        }
        .payments-table {
          width: 100%;
          border-collapse: collapse;
          min-width: 700px;
        }
        .payments-table th {
          background: #f1f5f9;
          padding: 12px 16px;
          text-align: left;
          font-size: 12px;
          font-weight: 600;
          color: #475569;
          text-transform: uppercase;
        }
        .payments-table td {
          padding: 12px 16px;
          border-bottom: 1px solid #f1f5f9;
          cursor: pointer;
          font-size: 14px;
        }
        @media (max-width: 768px) {
          .payments-table td, .payments-table th {
            padding: 8px 10px;
            font-size: 12px;
          }
        }
        .payments-table tr.expanded td {
          border-bottom: none;
        }
        .payments-table tr:hover td {
          background: #f8fafc;
        }
        .code-cell {
          font-weight: 600;
          color: #0f172a;
        }
        .eye-icon {
          cursor: pointer;
          font-size: 18px;
          opacity: 0.6;
          display: inline-block;
        }
        .eye-icon:hover {
          opacity: 1;
        }
        .eye-icon.loading {
          animation: spin 1s linear infinite;
          opacity: 1;
        }

        .expanded-details {
          padding: 20px;
          background: #f8fafc;
        }
        @media (max-width: 768px) {
          .expanded-details { padding: 12px; }
        }
        .details-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
          gap: 20px;
        }
        @media (max-width: 480px) {
          .details-grid { grid-template-columns: 1fr; gap: 12px; }
        }
        .detail-section h4 {
          margin: 0 0 12px 0;
          color: #0f172a;
          font-size: 14px;
          font-weight: 600;
        }
        .detail-section p {
          margin: 4px 0;
          font-size: 13px;
          color: #475569;
        }
        .detail-section p strong {
          color: #0f172a;
        }

        .user-avatar {
          display: flex;
          align-items: center;
          gap: 12px;
          flex-wrap: wrap;
        }
        .user-avatar img {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          object-fit: cover;
        }
        .avatar-placeholder {
          width: 50px;
          height: 50px;
          border-radius: 50%;
          background: #8b5cf6;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 20px;
          font-weight: 600;
          flex-shrink: 0;
        }

        .timeline-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 4px 0;
          font-size: 13px;
          flex-wrap: wrap;
        }
        .timeline-icon { font-size: 16px; }
        .timeline-event { color: #0f172a; flex: 1; }
        .timeline-time { color: #94a3b8; font-size: 12px; }

        .action-buttons {
          display: flex;
          gap: 8px;
          flex-wrap: wrap;
        }
        .action-btn {
          padding: 6px 14px;
          border: none;
          border-radius: 6px;
          font-size: 12px;
          font-weight: 500;
          cursor: pointer;
        }
        .action-btn.assign { background: #dbeafe; color: #1d4ed8; }
        .action-btn.claim { background: #d1fae5; color: #065f46; }
        .action-btn.export { background: #fef3c7; color: #92400e; }

        .pagination {
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          margin-top: 20px;
          flex-wrap: wrap;
        }
        .pagination button {
          padding: 8px 16px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          background: white;
          cursor: pointer;
        }
        .pagination button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
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
          z-index: 10000;
          padding: 20px;
        }
        .modal {
          background: white;
          padding: 30px;
          border-radius: 16px;
          max-width: 500px;
          width: 100%;
        }
        @media (max-width: 480px) {
          .modal { padding: 20px; }
        }
        .modal h3 {
          margin: 0 0 8px 0;
          color: #0f172a;
        }
        .modal p { color: #64748b; margin-bottom: 16px; }
        .modal-form label {
          display: block;
          font-weight: 500;
          color: #0f172a;
          margin-top: 12px;
        }
        .modal-form select {
          width: 100%;
          padding: 10px;
          border: 1px solid #e2e8f0;
          border-radius: 8px;
          margin-top: 4px;
        }
        .modal-actions {
          display: flex;
          gap: 12px;
          margin-top: 20px;
          justify-content: flex-end;
        }
        .modal-btn {
          padding: 10px 20px;
          border: none;
          border-radius: 8px;
          cursor: pointer;
        }
        .modal-btn.cancel { background: #e2e8f0; color: #0f172a; }
        .modal-btn.confirm { background: #0f172a; color: white; }

        .loading-state, .error-state, .empty-state {
          text-align: center;
          padding: 60px 20px;
          color: #64748b;
        }
        .spinner {
          width: 40px;
          height: 40px;
          margin: 0 auto 16px;
          border: 3px solid #e2e8f0;
          border-top-color: #0f172a;
          border-radius: 50%;
          animation: spin 1s linear infinite;
        }
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default BankPayments;