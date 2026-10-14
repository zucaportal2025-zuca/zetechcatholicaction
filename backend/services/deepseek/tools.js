// ================== DEEPSEEK TOOL DEFINITIONS ==================

const tools = [
  // ==================== NAVIGATION ====================
  {
    type: "function",
    function: {
      name: "navigate_to_page",
      description: "Navigate the user to a specific page in the ZUCA portal",
      parameters: {
        type: "object",
        properties: {
          page: {
            type: "string",
            enum: [
              "dashboard", "announcements", "mass-programs", "contributions",
              "chat", "hymns", "liturgical-calendar", "gallery", "join-jumuia",
              "games", "youtube", "schedules", "executive", "profile",
              "admin", "admin-users", "admin-roles", "admin-media",
              "admin-songs", "admin-hymns", "admin-announcements",
              "admin-contributions", "admin-jumuia", "admin-schedules",
              "admin-chat", "admin-security", "admin-analytics",
              "admin-health", "admin-executive", "admin-pending-songs",
              "admin-ocr", "admin-activity"
            ],
            description: "The page to navigate to"
          }
        },
        required: ["page"]
      }
    }
  },

  // ==================== USER PROFILE ====================
  {
    type: "function",
    function: {
      name: "get_my_profile",
      description: "Get the current user's profile information",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_my_pledges",
      description: "Get all pledges and contribution status for the current user",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_my_notifications",
      description: "Get unread notifications for the current user",
      parameters: {
        type: "object",
        properties: { markAsRead: { type: "boolean", description: "Whether to mark all as read" } },
        required: []
      }
    }
  },

  // ==================== CONTRIBUTIONS & PLEDGES ====================
  {
    type: "function",
    function: {
      name: "create_pledge",
      description: "Create a new pledge for the current user",
      parameters: {
        type: "object",
        properties: {
          amount: { type: "number", description: "Amount to pledge in KES" },
          campaignTitle: { type: "string", description: "Optional: specific campaign to pledge to" }
        },
        required: ["amount"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_active_campaigns",
      description: "Get all active contribution campaigns",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "create_campaign",
      description: "Create a new contribution campaign (admin/treasurer only)",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Campaign title" },
          description: { type: "string", description: "Campaign description" },
          amountRequired: { type: "number", description: "Target amount per member in KES" },
          deadline: { type: "string", description: "Optional deadline (ISO date)" }
        },
        required: ["title", "amountRequired"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "approve_pledge",
      description: "Approve a user's pending pledge (admin/treasurer only)",
      parameters: {
        type: "object",
        properties: { pledgeId: { type: "string", description: "The pledge ID to approve" } },
        required: ["pledgeId"]
      }
    }
  },

  // ==================== MASS PROGRAMS & LITURGY ====================
  {
    type: "function",
    function: {
      name: "get_upcoming_masses",
      description: "Get upcoming mass programs",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "Number of masses to return (default 5)" } },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_todays_readings",
      description: "Get today's liturgical readings",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_readings_by_date",
      description: "Get liturgical readings for a specific date",
      parameters: {
        type: "object",
        properties: { date: { type: "string", description: "Date in YYYY-MM-DD format" } },
        required: ["date"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_liturgical_calendar",
      description: "Get liturgical calendar for a month",
      parameters: {
        type: "object",
        properties: {
          year: { type: "number", description: "Year" },
          month: { type: "number", description: "Month (1-12)" }
        },
        required: ["year", "month"]
      }
    }
  },

  // ==================== HYMNS & SONGS ====================
  {
    type: "function",
    function: {
      name: "search_hymns",
      description: "Search for hymns by title, theme, lyrics, or usage",
      parameters: {
        type: "object",
        properties: {
          query: { type: "string", description: "Search query" },
          type: { type: "string", enum: ["entrance", "offertory", "communion", "exit", "mass", "bible", "procession", "thanksgiving"], description: "Optional: filter by mass program type" }
        },
        required: ["query"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_hymn_lyrics",
      description: "Get full lyrics for a specific hymn",
      parameters: {
        type: "object",
        properties: {
          hymnId: { type: "string", description: "Hymn ID" },
          title: { type: "string", description: "Hymn title to search" }
        },
        required: []
      }
    }
  },

  // ==================== JUMUIA ====================
  {
    type: "function",
    function: {
      name: "get_jumuia_list",
      description: "Get list of all jumuia groups with member counts",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_jumuia_details",
      description: "Get details about a specific jumuia",
      parameters: {
        type: "object",
        properties: {
          jumuiaName: { type: "string", description: "Jumuia name (e.g., 'St. Michael', 'St. Benedict')" },
          jumuiaCode: { type: "string", description: "Jumuia code (e.g., 'stmichael')" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "join_jumuia",
      description: "Join a jumuia group",
      parameters: {
        type: "object",
        properties: { jumuiaName: { type: "string", description: "Jumuia name to join" } },
        required: ["jumuiaName"]
      }
    }
  },

  // ==================== ANNOUNCEMENTS ====================
  {
    type: "function",
    function: {
      name: "get_announcements",
      description: "Get recent announcements",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "Number to return (default 5)" } },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "create_announcement",
      description: "Create a new announcement (admin/secretary only)",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Announcement title" },
          content: { type: "string", description: "Announcement content" },
          category: { type: "string", description: "Category (default 'General')" }
        },
        required: ["title", "content"]
      }
    }
  },

  // ==================== CHAT ====================
  {
    type: "function",
    function: {
      name: "post_to_chat",
      description: "Post a message to the community chat",
      parameters: {
        type: "object",
        properties: { message: { type: "string", description: "Message to post" } },
        required: ["message"]
      }
    }
  },

  // ==================== MEDIA ====================
  {
    type: "function",
    function: {
      name: "browse_media",
      description: "Browse media gallery",
      parameters: {
        type: "object",
        properties: {
          category: { type: "string", description: "Filter by category" },
          type: { type: "string", enum: ["image", "video", "audio"], description: "Filter by media type" },
          limit: { type: "number", description: "Number to return" }
        },
        required: []
      }
    }
  },

  // ==================== YOUTUBE ====================
  {
    type: "function",
    function: {
      name: "get_youtube_info",
      description: "Get ZUCA YouTube channel statistics and latest videos",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },

  // ==================== GAMES ====================
  {
    type: "function",
    function: {
      name: "challenge_player",
      description: "Send a game challenge to another user",
      parameters: {
        type: "object",
        properties: {
          playerName: { type: "string", description: "Name of player to challenge" },
          gameType: { type: "string", enum: ["tictactoe", "snake", "trivia"], description: "Game type" }
        },
        required: ["playerName", "gameType"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_game_status",
      description: "Check current user's active games",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },

  // ==================== EXECUTIVE MANAGEMENT ====================
  {
    type: "function",
    function: {
      name: "get_executive_team",
      description: "Get the current executive team",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_executive_by_position",
      description: "Get the executive for a specific position",
      parameters: {
        type: "object",
        properties: { position: { type: "string", description: "Position title (e.g., 'Secretary', 'Treasurer')" } },
        required: ["position"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "assign_executive",
      description: "Assign a user to an executive position (admin only)",
      parameters: {
        type: "object",
        properties: {
          userIdentifier: { type: "string", description: "User's name, email, membership number" },
          position: { type: "string", description: "Position title (e.g., 'Secretary', 'Treasurer', 'Chairperson')" }
        },
        required: ["userIdentifier", "position"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "remove_executive",
      description: "Remove a user from their executive position (admin only)",
      parameters: {
        type: "object",
        properties: { userIdentifier: { type: "string", description: "User's name, email, or membership number" } },
        required: ["userIdentifier"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "bulk_assign_executives",
      description: "Assign multiple executives at once (admin only)",
      parameters: {
        type: "object",
        properties: {
          assignments: {
            type: "array",
            description: "Array of assignments",
            items: {
              type: "object",
              properties: {
                userIdentifier: { type: "string", description: "User name, email, or membership number" },
                position: { type: "string", description: "Position title" }
              },
              required: ["userIdentifier", "position"]
            }
          }
        },
        required: ["assignments"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "bulk_remove_executives",
      description: "Remove multiple executives at once (admin only)",
      parameters: {
        type: "object",
        properties: {
          userIdentifiers: {
            type: "array",
            description: "Array of user names, emails, or membership numbers to remove",
            items: { type: "string" }
          }
        },
        required: ["userIdentifiers"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "swap_executives",
      description: "Swap two executives between positions (admin only)",
      parameters: {
        type: "object",
        properties: {
          user1: { type: "string", description: "First user's name, email, or membership number" },
          user2: { type: "string", description: "Second user's name, email, or membership number" }
        },
        required: ["user1", "user2"]
      }
    }
  },

  // ==================== SCHEDULE GENERATION ====================
  {
    type: "function",
    function: {
      name: "generate_schedule_from_text",
      description: "Parse raw schedule text and create a structured schedule (admin/secretary only)",
      parameters: {
        type: "object",
        properties: {
          rawText: { type: "string", description: "The raw schedule text to parse" },
          title: { type: "string", description: "Optional: Schedule title" },
          publishNow: { type: "boolean", description: "Whether to publish immediately (default false - review first)" }
        },
        required: ["rawText"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "list_schedules",
      description: "List all schedules (admin/secretary only)",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },

  // ==================== ADMIN - USER MANAGEMENT ====================
  {
    type: "function",
    function: {
      name: "list_all_users",
      description: "List all users in the system (admin only)",
      parameters: {
        type: "object",
        properties: { limit: { type: "number", description: "Number to return (default 20)" } },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "find_user",
      description: "Find a specific user by name, email, phone, or membership number (admin only)",
      parameters: {
        type: "object",
        properties: { searchTerm: { type: "string", description: "Name, email, phone, or membership number to search" } },
        required: ["searchTerm"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "change_user_role",
      description: "Change a user's role (admin only)",
      parameters: {
        type: "object",
        properties: {
          userIdentifier: { type: "string", description: "User's name, email, or membership number" },
          newRole: { type: "string", enum: ["admin", "member"], description: "New role" },
          newSpecialRole: { type: "string", enum: ["treasurer", "secretary", "choir_moderator", "media_moderator", "jumuia_leader"], description: "New special role (optional - omit to keep current)" }
        },
        required: ["userIdentifier", "newRole"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "delete_user",
      description: "Delete a user permanently (admin only)",
      parameters: {
        type: "object",
        properties: {
          userIdentifier: { type: "string", description: "User's name, email, or membership number" },
          confirm: { type: "boolean", description: "Must be true to confirm deletion" }
        },
        required: ["userIdentifier", "confirm"]
      }
    }
  },

  // ==================== ADMIN - SYSTEM STATS ====================
  {
    type: "function",
    function: {
      name: "get_system_stats",
      description: "Get platform overview statistics (admin only)",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },
  {
    type: "function",
    function: {
      name: "get_system_health",
      description: "Get system health status including uptime, memory, errors (admin only)",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },

  // ==================== CONTENT GENERATION ====================
  {
    type: "function",
    function: {
      name: "generate_content",
      description: "Generate content like prayers, reflections, or announcements",
      parameters: {
        type: "object",
        properties: {
          contentType: { type: "string", enum: ["prayer", "reflection", "quiz", "newsletter", "social_post", "announcement_draft"], description: "Type of content to generate" },
          topic: { type: "string", description: "Topic or subject for the content" },
          additionalContext: { type: "string", description: "Any additional context" }
        },
        required: ["contentType", "topic"]
      }
    }
  },

  // ==================== WEB SEARCH ====================
  {
    type: "function",
    function: {
      name: "search_web",
      description: "Search the web for Catholic resources and information",
      parameters: {
        type: "object",
        properties: { query: { type: "string", description: "Search query" } },
        required: ["query"]
      }
    }
  },

  // ==================== HELP ====================
  {
    type: "function",
    function: {
      name: "show_help",
      description: "Show the user what they can do based on their role",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },

  // ==================== EMAIL & NOTIFICATIONS ====================
  {
    type: "function",
    function: {
      name: "send_bulk_email",
      description: "Send an email announcement to ALL users (admin/secretary only)",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Email subject line" },
          message: { type: "string", description: "Email body content / announcement message" }
        },
        required: ["title", "message"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "send_email",
      description: "Send an email to a specific user (admin only)",
      parameters: {
        type: "object",
        properties: {
          userIdentifier: { type: "string", description: "User's name, email, or membership number" },
          title: { type: "string", description: "Email subject line" },
          message: { type: "string", description: "Email body content" }
        },
        required: ["userIdentifier", "title", "message"]
      }
    }
  },

  // ==================== CONTRIBUTIONS LIST ====================
  {
    type: "function",
    function: {
      name: "list_all_contributions",
      description: "List all contributions/campaigns with their progress",
      parameters: { type: "object", properties: {}, required: [] }
    }
  },

 

// ==================== ATTENDANCE ====================
{
  type: "function",
  function: {
    name: "get_my_attendance_records",
    description: "Get attendance history and records. Works for current user or for a specific user when providing membership number (admin only)",
    parameters: {
      type: "object",
      properties: {
        limit: { type: "number", description: "Number of records to return (default 20)" },
        membershipNumber: { type: "string", description: "Optional: user's membership number (e.g., Z#003) - admin only" },
        userIdentifier: { type: "string", description: "Optional: user's name or email - admin only" }
      },
      required: []
    }
  }
},
  {
    type: "function",
    function: {
      name: "get_attendance_by_date",
      description: "Get attendance records for a specific date range",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Start date in YYYY-MM-DD format" },
          endDate: { type: "string", description: "End date in YYYY-MM-DD format (optional, defaults to startDate)" }
        },
        required: ["startDate"]
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_attendance_summary",
      description: "Get attendance summary including monthly stats and upcoming events",
      parameters: {
        type: "object",
        properties: {},
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "check_in",
      description: "Check in to a mass or event",
      parameters: {
        type: "object",
        properties: {
          sheetId: { type: "string", description: "Attendance sheet ID (optional - will auto-find today's active sheet)" },
          signMethod: { type: "string", enum: ["Manual", "QR", "WhatsApp", "Admin"], description: "Method used to check in (default: Manual)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_attendance_sheet",
      description: "View a full attendance sheet with all entries (admin/secretary only)",
      parameters: {
        type: "object",
        properties: {
          sheetId: { type: "string", description: "Attendance sheet ID" },
          date: { type: "string", description: "Date in YYYY-MM-DD format (if no sheetId provided)" }
        },
        required: []
      }
    }
  },
  {
    type: "function",
    function: {
      name: "get_attendance_stats",
      description: "Get attendance statistics including total, present, absent, late (admin only)",
      parameters: {
        type: "object",
        properties: {
          startDate: { type: "string", description: "Start date in YYYY-MM-DD format (default: 30 days ago)" },
          endDate: { type: "string", description: "End date in YYYY-MM-DD format (default: today)" }
        },
        required: []
      }
    }
  }
];

module.exports = tools;