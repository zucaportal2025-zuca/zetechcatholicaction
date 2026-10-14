// frontend/src/pages/admin/Advertisements.jsx

import React, { useEffect, useState } from "react";
import { api } from "../../api";
import "./Advertisements.css";
import {
  FiPlus,
  FiEdit2,
  FiTrash2,
  FiPower,
  FiRefreshCw,
  FiImage,
  FiCalendar,
  FiExternalLink,
  FiX,
  FiCheck,
  FiClock,
  FiAlertCircle,
  FiArrowLeft
} from "react-icons/fi";
import { useNavigate } from "react-router-dom";

const PORTAL_PAGES = [
  // PUBLIC PAGES
  { label: "Landing Page", path: "/" },
  { label: "Home", path: "/home" },
  { label: "Login", path: "/login" },
  { label: "Register", path: "/register" },
  { label: "Forgot Password", path: "/forgot-password" },
  { label: "Reset Password", path: "/reset-password" },
  { label: "User Manual", path: "/user-manual" },

  // MEMBER PAGES
  { label: "Dashboard", path: "/dashboard" },
  { label: "Announcements", path: "/announcements" },
  { label: "Mass Programs", path: "/mass-programs" },
  { label: "Contributions", path: "/contributions" },
  { label: "Jumuia Contributions", path: "/jumuia-contributions" },
  { label: "Join Jumuia", path: "/join-jumuia" },

  // MUSIC & PRAYER
  { label: "Hymn Book", path: "/hymns" },
  { label: "Prayer", path: "/prayer" },

  // MEDIA
  { label: "Gallery", path: "/gallery" },
  { label: "YouTube", path: "/youtube" },

  // SCHEDULES & READINGS
  { label: "Schedules", path: "/schedules" },
  { label: "Mass Readings", path: "/mass-readings" },
  { label: "Liturgical Calendar", path: "/liturgical-calendar" },

  // COMMUNICATION
  { label: "Messenger", path: "/messenger" },
  { label: "Chat", path: "/chat" },

  // GAMES
  { label: "Games", path: "/games" },

  // OTHER
  { label: "Executive", path: "/executive" },
  { label: "Feedback", path: "/feedback" },
];



const Advertisements = () => {
  const navigate = useNavigate();

  const [advertisements, setAdvertisements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);

  const [showModal, setShowModal] = useState(false);
  const [editingAd, setEditingAd] = useState(null);

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

const [form, setForm] = useState({
  title: "",
  description: "",
  buttonText: "",
  link: "/",
  startDate: "",
  endDate: "",
  active: true,
  image: null
});


  

  const token = localStorage.getItem("token");

  const headers = {
    Authorization: `Bearer ${token}`
  };

// ==========================================
// FETCH ADVERTISEMENTS
// ==========================================

const fetchAdvertisements = async () => {
  try {
    setError("");
    setLoading(true);
    setRefreshing(true);

    const token = localStorage.getItem("token");

    console.log(
      "🔑 Advertisement token exists:",
      !!token
    );

    console.log(
      "🌐 Fetching advertisements from:",
      "/api/advertisements/admin/all"
    );

    if (!token) {
      setError("You are not logged in.");
      navigate("/login");
      return;
    }

    const response = await api.get(
      "/api/advertisements/admin/all",
      {
        timeout: 15000
      }
    );

    console.log(
      "✅ Advertisements response:",
      response.data
    );

    setAdvertisements(
      Array.isArray(
        response.data?.advertisements
      )
        ? response.data.advertisements
        : []
    );

  } catch (err) {
    console.error(
      "❌ Failed to fetch advertisements:",
      err
    );

    if (err.response) {
      console.error(
        "Status:",
        err.response.status
      );

      console.error(
        "Response:",
        err.response.data
      );
    }

    setError(
      err.response?.data?.error ||
      err.message ||
      "Failed to load advertisements"
    );

    setAdvertisements([]);

  } finally {
    console.log(
      "🏁 Advertisement loading finished"
    );

    setLoading(false);
    setRefreshing(false);
  }
};

// ==========================================
// INITIAL FETCH
// ==========================================

useEffect(() => {
  if (!token) {
    navigate("/login");
    return;
  }

  fetchAdvertisements();
}, []);

  // ==========================================
  // FORM HANDLERS
  // ==========================================

  const handleChange = (e) => {
    const { name, value, type, checked, files } =
      e.target;

    if (type === "file") {
      setForm((prev) => ({
        ...prev,
        image: files?.[0] || null
      }));

      return;
    }

    setForm((prev) => ({
      ...prev,
      [name]:
        type === "checkbox" ? checked : value
    }));
  };


  const handlePageSelect = (e) => {
  const value = e.target.value;

  if (!value) return;

  setForm((prev) => ({
    ...prev,
    link: value
  }));
};

  // ==========================================
  // OPEN CREATE
  // ==========================================

  const openCreateModal = () => {
    setEditingAd(null);

   setForm({
  title: "",
  description: "",
  buttonText: "",
  link: "/",
  startDate: "",
  endDate: "",
  active: true,
  image: null
});

    setError("");
    setShowModal(true);
  };

  // ==========================================
  // OPEN EDIT
  // ==========================================

  const openEditModal = (ad) => {
    setEditingAd(ad);

    setForm({
      title: ad.title || "",
      description: ad.description || "",
      buttonText: ad.buttonText || "",
      link: ad.link || "",
      startDate: ad.startDate
        ? formatDateTimeLocal(ad.startDate)
        : "",
      endDate: ad.endDate
        ? formatDateTimeLocal(ad.endDate)
        : "",
      active: ad.active,
      image: null
    });

    setError("");
    setShowModal(true);
  };

  // ==========================================
  // FORMAT DATE FOR INPUT
  // ==========================================

  const formatDateTimeLocal = (dateString) => {
    const date = new Date(dateString);

    const year = date.getFullYear();

    const month = String(
      date.getMonth() + 1
    ).padStart(2, "0");

    const day = String(
      date.getDate()
    ).padStart(2, "0");

    const hours = String(
      date.getHours()
    ).padStart(2, "0");

    const minutes = String(
      date.getMinutes()
    ).padStart(2, "0");

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  };

  // ==========================================
  // SAVE ADVERTISEMENT
  // ==========================================

  const handleSubmit = async (e) => {
    e.preventDefault();

    setSaving(true);
    setError("");
    setSuccess("");

    try {
      if (!form.startDate || !form.endDate) {
        setError(
          "Start date and end date are required."
        );
        setSaving(false);
        return;
      }

      if (
        new Date(form.endDate) <=
        new Date(form.startDate)
      ) {
        setError(
          "End date must be after start date."
        );
        setSaving(false);
        return;
      }

      const formData = new FormData();

      formData.append(
        "title",
        form.title
      );

      formData.append(
        "description",
        form.description
      );

      formData.append(
        "buttonText",
        form.buttonText
      );

      formData.append(
        "link",
        form.link
      );

      formData.append(
        "startDate",
        new Date(form.startDate).toISOString()
      );

      formData.append(
        "endDate",
        new Date(form.endDate).toISOString()
      );

      formData.append(
        "active",
        form.active
      );

      if (form.image) {
        formData.append(
          "image",
          form.image
        );
      }

      if (editingAd) {
        await api.put(
  `/api/advertisements/${editingAd.id}`,
  formData,
  {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  }
);

        setSuccess(
          "Advertisement updated successfully."
        );
      } else {
        await api.post(
  "/api/advertisements",
  formData,
  {
    headers: {
      "Content-Type": "multipart/form-data"
    }
  }
);

        setSuccess(
          "Advertisement created successfully."
        );
      }

      setShowModal(false);

      await fetchAdvertisements();

    } catch (err) {
      console.error(
        "Advertisement save error:",
        err
      );

      setError(
        err.response?.data?.error ||
          "Failed to save advertisement."
      );
    } finally {
      setSaving(false);
    }
  };

  // ==========================================
  // TOGGLE
  // ==========================================

  const handleToggle = async (ad) => {
    try {
      setError("");

     await api.patch(
  `/api/advertisements/${ad.id}/toggle`
);

      setSuccess(
        `Advertisement ${
          ad.active
            ? "deactivated"
            : "activated"
        } successfully.`
      );

      fetchAdvertisements();

    } catch (err) {
      console.error(
        "Toggle error:",
        err
      );

      setError(
        err.response?.data?.error ||
          "Failed to update advertisement."
      );
    }
  };

  // ==========================================
  // DELETE
  // ==========================================

  const handleDelete = async (ad) => {
    const confirmed = window.confirm(
      `Delete "${ad.title || "this advertisement"}" permanently?`
    );

    if (!confirmed) return;

    try {
      setError("");

     await api.delete(
  `/api/advertisements/${ad.id}`
);

      setSuccess(
        "Advertisement deleted successfully."
      );

      fetchAdvertisements();

    } catch (err) {
      console.error(
        "Delete error:",
        err
      );

      setError(
        err.response?.data?.error ||
          "Failed to delete advertisement."
      );
    }
  };

  // ==========================================
  // CLEANUP EXPIRED
  // ==========================================

  const cleanupExpired = async () => {
    const confirmed = window.confirm(
      "Remove all expired advertisements?"
    );

    if (!confirmed) return;

    try {
      setError("");

    const response = await api.delete(
  "/api/advertisements/admin/cleanup-expired"
);

      setSuccess(
        response.data?.message ||
          "Expired advertisements cleaned up."
      );

      fetchAdvertisements();

    } catch (err) {
      console.error(
        "Cleanup error:",
        err
      );

      setError(
        err.response?.data?.error ||
          "Failed to clean expired advertisements."
      );
    }
  };

  // ==========================================
  // REFRESH
  // ==========================================

  const handleRefresh = async () => {
    setRefreshing(true);
    await fetchAdvertisements();
  };

  // ==========================================
  // DATE HELPERS
  // ==========================================

  const formatDate = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleDateString(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        year: "numeric"
      }
    );
  };

  const formatDateTime = (date) => {
    if (!date) return "—";

    return new Date(date).toLocaleString(
      "en-GB",
      {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      }
    );
  };

  // ==========================================
  // AD STATUS
  // ==========================================

  const getStatus = (ad) => {
    const now = new Date();

    const start = new Date(
      ad.startDate
    );

    const end = new Date(
      ad.endDate
    );

    if (end <= now) {
      return "expired";
    }

    if (start > now) {
      return "scheduled";
    }

    if (ad.active) {
      return "active";
    }

    return "inactive";
  };

  // ==========================================
  // COUNTS
  // ==========================================

  const activeCount =
    advertisements.filter(
      (ad) =>
        getStatus(ad) === "active"
    ).length;

  const scheduledCount =
    advertisements.filter(
      (ad) =>
        getStatus(ad) === "scheduled"
    ).length;

  const expiredCount =
    advertisements.filter(
      (ad) =>
        getStatus(ad) === "expired"
    ).length;

  // ==========================================
  // RENDER
  // ==========================================

  return (
    <div className="advertisements-page">

      {/* HEADER */}

      <div className="advertisements-header">

        <div className="advertisements-header-left">

          <button
  className="back-button"
  onClick={() => {
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    const role = user.specialRole || user.role;
    
    // If Media Moderator, go to their dashboard
    if (role === 'media_moderator') {
      navigate('/media-moderator');
    } else {
      navigate('/admin');
    }
  }}
>
  <FiArrowLeft />
</button>

          <div>
            <h1>
              Advertisement Management
            </h1>

            <p>
              Manage advertisements displayed
              across the ZUCA Portal
            </p>
          </div>

        </div>

        <div className="advertisements-header-actions">

          <button
            className="secondary-button"
            onClick={cleanupExpired}
          >
            <FiClock />
            Clean Expired
          </button>

          <button
            className="secondary-button"
            onClick={handleRefresh}
            disabled={refreshing}
          >
            <FiRefreshCw
              className={
                refreshing
                  ? "spinning"
                  : ""
              }
            />
            Refresh
          </button>

          <button
            className="primary-button"
            onClick={openCreateModal}
          >
            <FiPlus />
            New Advertisement
          </button>

        </div>

      </div>

      {/* ALERTS */}

      {success && (
        <div className="alert success-alert">
          <FiCheck />
          <span>{success}</span>

          <button
            onClick={() =>
              setSuccess("")
            }
          >
            <FiX />
          </button>
        </div>
      )}

      {error && (
        <div className="alert error-alert">
          <FiAlertCircle />
          <span>{error}</span>

          <button
            onClick={() =>
              setError("")
            }
          >
            <FiX />
          </button>
        </div>
      )}

      {/* SUMMARY */}

      <div className="advertisement-summary">

        <div className="summary-card">
          <div className="summary-icon active">
            <FiCheck />
          </div>

          <div>
            <strong>
              {activeCount}
            </strong>
            <span>
              Active
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon scheduled">
            <FiClock />
          </div>

          <div>
            <strong>
              {scheduledCount}
            </strong>
            <span>
              Scheduled
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon expired">
            <FiAlertCircle />
          </div>

          <div>
            <strong>
              {expiredCount}
            </strong>
            <span>
              Expired
            </span>
          </div>
        </div>

        <div className="summary-card">
          <div className="summary-icon total">
            <FiImage />
          </div>

          <div>
            <strong>
              {advertisements.length}
            </strong>
            <span>
              Total Advertisements
            </span>
          </div>
        </div>

      </div>

      {/* ADVERTISEMENTS */}

      <div className="advertisements-section">

        <div className="section-title">
          <div>
            <h2>
              All Advertisements
            </h2>

            <p>
              Create and manage your portal
              advertising campaigns.
            </p>
          </div>

          <span className="advertisement-count">
            {advertisements.length} ads
          </span>
        </div>

        {loading ? (

          <div className="advertisements-loading">
            <FiRefreshCw className="spinning" />
            <span>
              Loading advertisements...
            </span>
          </div>

        ) : advertisements.length === 0 ? (

          <div className="empty-advertisements">

            <div className="empty-ad-icon">
              <FiImage />
            </div>

            <h3>
              No Advertisements Yet
            </h3>

            <p>
              Create your first advertisement
              to display content across the
              ZUCA Portal.
            </p>

            <button
              className="primary-button"
              onClick={openCreateModal}
            >
              <FiPlus />
              Create Advertisement
            </button>

          </div>

        ) : (

          <div className="advertisements-grid">

            {advertisements.map((ad) => {

              const status =
                getStatus(ad);

              return (
                <div
                  className="advertisement-card"
                  key={ad.id}
                >

                  {/* IMAGE */}

                  <div className="advertisement-image">

                    {ad.image ? (
                      <img
                        src={ad.image}
                        alt={
                          ad.title ||
                          "Advertisement"
                        }
                      />
                    ) : (
                      <div className="no-ad-image">
                        <FiImage />
                        <span>
                          No Image
                        </span>
                      </div>
                    )}

                    <span
                      className={`status-badge ${status}`}
                    >
                      {status === "active" && (
                        <>
                          <FiCheck />
                          Active
                        </>
                      )}

                      {status === "scheduled" && (
                        <>
                          <FiClock />
                          Scheduled
                        </>
                      )}

                      {status === "expired" && (
                        <>
                          <FiAlertCircle />
                          Expired
                        </>
                      )}

                      {status === "inactive" && (
                        <>
                          <FiPower />
                          Inactive
                        </>
                      )}
                    </span>

                  </div>

                  {/* CONTENT */}

                  <div className="advertisement-body">

                    <div className="advertisement-title-row">

                      <h3>
                        {ad.title ||
                          "Untitled Advertisement"}
                      </h3>

                      <span className="ad-id">
                        #{ad.id}
                      </span>

                    </div>

                    {ad.description && (
                      <p className="advertisement-description">
                        {ad.description}
                      </p>
                    )}

                    <div className="advertisement-dates">

                      <div>
                        <FiCalendar />

                        <span>
                          <small>
                            Starts
                          </small>

                          {formatDate(
                            ad.startDate
                          )}
                        </span>
                      </div>

                      <div>
                        <FiCalendar />

                        <span>
                          <small>
                            Ends
                          </small>

                          {formatDate(
                            ad.endDate
                          )}
                        </span>
                      </div>

                    </div>

                    {ad.buttonText && (
                      <div className="advertisement-button-preview">
                        <span>
                          Button
                        </span>

                        <strong>
                          {ad.buttonText}
                        </strong>
                      </div>
                    )}

                    {ad.link && (
                      <a
                        href={ad.link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="advertisement-link"
                      >
                        <FiExternalLink />
                        Open Advertisement Link
                      </a>
                    )}

                  </div>

                  {/* ACTIONS */}

                  <div className="advertisement-actions">

                    <button
                      className={`toggle-button ${
                        ad.active
                          ? "deactivate"
                          : "activate"
                      }`}
                      onClick={() =>
                        handleToggle(ad)
                      }
                    >
                      <FiPower />

                      {ad.active
                        ? "Deactivate"
                        : "Activate"}
                    </button>

                    <button
                      className="edit-button"
                      onClick={() =>
                        openEditModal(ad)
                      }
                    >
                      <FiEdit2 />
                      Edit
                    </button>

                    <button
                      className="delete-button"
                      onClick={() =>
                        handleDelete(ad)
                      }
                    >
                      <FiTrash2 />
                    </button>

                  </div>

                  <div className="advertisement-created">
                    Created{" "}
                    {formatDateTime(
                      ad.createdAt
                    )}
                  </div>

                </div>
              );
            })}

          </div>

        )}

      </div>

      {/* ========================================
          CREATE / EDIT MODAL
      ======================================== */}

      {showModal && (

        <div
          className="advertisement-modal-overlay"
          onClick={() =>
            !saving &&
            setShowModal(false)
          }
        >

          <div
            className="advertisement-modal"
            onClick={(e) =>
              e.stopPropagation()
            }
          >

            <div className="modal-header">

              <div>
                <h2>
                  {editingAd
                    ? "Edit Advertisement"
                    : "Create Advertisement"}
                </h2>

                <p>
                  {editingAd
                    ? "Update advertisement details"
                    : "Create a new portal advertisement"}
                </p>
              </div>

              <button
                className="modal-close"
                onClick={() =>
                  !saving &&
                  setShowModal(false)
                }
              >
                <FiX />
              </button>

            </div>

            <form
              onSubmit={handleSubmit}
              className="advertisement-form"
            >

              {/* IMAGE */}

              <div className="form-group">

                <label>
                  Advertisement Image
                </label>

                <label className="image-upload">

                  {form.image ? (

                    <div className="selected-image">
                      <img
                        src={URL.createObjectURL(
                          form.image
                        )}
                        alt="Preview"
                      />

                      <span>
                        Change Image
                      </span>
                    </div>

                  ) : editingAd?.image ? (

                    <div className="selected-image">
                      <img
                        src={editingAd.image}
                        alt="Current advertisement"
                      />

                      <span>
                        Click to replace image
                      </span>
                    </div>

                  ) : (

                    <div className="upload-placeholder">
                      <FiImage />

                      <strong>
                        Upload Advertisement
                      </strong>

                      <span>
                        PNG, JPG, WEBP — Max 10MB
                      </span>
                    </div>

                  )}

                  <input
                    type="file"
                    name="image"
                    accept="image/*"
                    onChange={handleChange}
                  />

                </label>

              </div>

              {/* TITLE */}

              <div className="form-group">

                <label>
                  Title
                </label>

                <input
                  type="text"
                  name="title"
                  value={form.title}
                  onChange={handleChange}
                  placeholder="Advertisement title"
                />

              </div>

              {/* DESCRIPTION */}

              <div className="form-group">

                <label>
                  Description
                </label>

                <textarea
                  name="description"
                  value={form.description}
                  onChange={handleChange}
                  placeholder="Describe the advertisement..."
                  rows="4"
                />

              </div>

              {/* BUTTON */}
<div className="form-group">
  <label>
    Button Link
  </label>

  <select
    value={form.link}
    onChange={handlePageSelect}
  >
    <option value="">
      Select a page
    </option>

    {PORTAL_PAGES.map((page) => (
      <option
        key={page.path}
        value={page.path}
      >
        {page.label}
      </option>
    ))}
  </select>

  <small className="form-help">
    Choose the page users will open when they click
    the advertisement button.
  </small>
</div>



              {/* DATES */}

              <div className="form-row">

                <div className="form-group">

                  <label>
                    Start Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    name="startDate"
                    value={form.startDate}
                    onChange={handleChange}
                    required
                  />

                </div>

                <div className="form-group">

                  <label>
                    End Date & Time
                  </label>

                  <input
                    type="datetime-local"
                    name="endDate"
                    value={form.endDate}
                    onChange={handleChange}
                    required
                  />

                </div>

              </div>

              {/* ACTIVE */}

              <label className="active-toggle">

                <input
                  type="checkbox"
                  name="active"
                  checked={form.active}
                  onChange={handleChange}
                />

                <span className="toggle-slider"></span>

                <div>
                  <strong>
                    Advertisement Active
                  </strong>

                  <small>
                    Allow this advertisement
                    to be displayed when its
                    schedule is active.
                  </small>
                </div>

              </label>

              {/* FORM ACTIONS */}

              <div className="modal-actions">

                <button
                  type="button"
                  className="cancel-button"
                  onClick={() =>
                    setShowModal(false)
                  }
                  disabled={saving}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="primary-button"
                  disabled={saving}
                >
                  {saving ? (
                    <>
                      <FiRefreshCw className="spinning" />
                      Saving...
                    </>
                  ) : (
                    <>
                      <FiCheck />
                      {editingAd
                        ? "Save Changes"
                        : "Create Advertisement"}
                    </>
                  )}
                </button>

              </div>

            </form>

          </div>

        </div>

      )}

    </div>
  );
};

export default Advertisements;