import React, { useState, useEffect } from "react";
import axios from "axios";

interface Deliverable {
  id: number;
  title: string;
  dueDate: string;
  frequency: string;
  manager: string;
  project: { id: number; name: string };
}

const API_BASE = "http://localhost:4000/api";
const ITEMS_PER_PAGE = 10;

// Date ranges helper (same as filter)
const getDateRange = (filter: string) => {
  const now = new Date();
  let start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let end = new Date(start);

  switch (filter) {
    case "nextWeek":
      end.setDate(start.getDate() + 7);
      break;
    case "nextMonth":
      end.setMonth(start.getMonth() + 1);
      break;
    case "nextQuarter":
      end.setMonth(start.getMonth() + 3);
      break;
    case "next6Months":
      end.setMonth(start.getMonth() + 6);
      break;
    case "nextYear":
      end.setFullYear(start.getFullYear() + 1);
      break;
    default:
      start = new Date(0);
      end = new Date(8640000000000000);
  }
  return { start, end };
};

// Urgency colors matching those filters
const urgencyColors = {
  overdue: "#fee2e2", // red-200
  weekly: "#fed7aa", // orange-300
  monthly: "#fde68a", // yellow-300
  quarterly: "#bbf7d0", // green-200
  sixMonths: "#bfdbfe", // blue-200
  yearly: "#ddd6fe", // indigo-200
};

function App() {
  const [allDeliverables, setAllDeliverables] = useState<Deliverable[]>([]);
  const [filteredDeliverables, setFilteredDeliverables] = useState<
    Deliverable[]
  >([]);
  const [search, setSearch] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState("");
  const [projectFilter, setProjectFilter] = useState("");
  const [projects, setProjects] = useState<{ id: number; name: string }[]>([]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    title: "",
    projectId: "",
    dueDate: "",
    frequency: "M",
    manager: "",
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    axios
      .get(`${API_BASE}/projects`)
      .then((res) => {
        setProjects(res.data);
        const projectIds = res.data.map((p: any) => p.id);
        return Promise.all(
          projectIds.map((id: number) =>
            axios
              .get(`${API_BASE}/projects/${id}/deliverables`)
              .then((res) => res.data),
          ),
        );
      })
      .then((results) => {
        const all = results.flat();
        setAllDeliverables(all);
        setFilteredDeliverables(all);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load deliverables");
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    let filtered = allDeliverables;

    if (search.trim()) {
      const term = search.toLowerCase();
      filtered = filtered.filter(
        (d) =>
          d.title.toLowerCase().includes(term) ||
          d.project.name.toLowerCase().includes(term) ||
          d.manager.toLowerCase().includes(term) ||
          d.frequency.toLowerCase().includes(term),
      );
    }

    if (projectFilter) {
      filtered = filtered.filter(
        (d) => d.project.id.toString() === projectFilter,
      );
    }

    let rangeStart: Date;
    let rangeEnd: Date;

    if (dateFilter) {
      const range = getDateRange(dateFilter);
      rangeStart = range.start;
      rangeEnd = range.end;
    } else {
      rangeStart = new Date(0);
      rangeEnd = new Date(8640000000000000);
    }

    filtered = filtered.filter((d) => {
      const due = new Date(d.dueDate);
      return due >= rangeStart && due <= rangeEnd;
    });

    filtered.sort(
      (a, b) => new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime(),
    );

    setFilteredDeliverables(filtered);
    setCurrentPage(1);
  }, [search, allDeliverables, dateFilter, projectFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !formData.title.trim() ||
      !formData.projectId ||
      !formData.dueDate ||
      !formData.manager.trim()
    ) {
      setError("All fields are required");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      await axios.post(
        `${API_BASE}/projects/${formData.projectId}/deliverables`,
        {
          title: formData.title,
          dueDate: formData.dueDate,
          frequency: formData.frequency,
          manager: formData.manager,
        },
      );

      const projectIds = projects.map((p) => p.id);
      const results = await Promise.all(
        projectIds.map((id) =>
          axios
            .get(`${API_BASE}/projects/${id}/deliverables`)
            .then((res) => res.data),
        ),
      );
      const all = results.flat();
      setAllDeliverables(all);

      setFormData({
        title: "",
        projectId: "",
        dueDate: "",
        frequency: "M",
        manager: "",
      });
      setShowAddModal(false);
    } catch (err: any) {
      setError(err.response?.data?.message || "Failed to add deliverable");
    } finally {
      setSaving(false);
    }
  };

  const totalPages = Math.ceil(filteredDeliverables.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const currentDeliverables = filteredDeliverables.slice(
    startIndex,
    startIndex + ITEMS_PER_PAGE,
  );

  const goToPage = (page: number) => setCurrentPage(page);
  const nextPage = () =>
    currentPage < totalPages && setCurrentPage(currentPage + 1);
  const prevPage = () => currentPage > 1 && setCurrentPage(currentPage - 1);

  // Urgency color logic
  const getUrgencyColor = (dueDate: string) => {
    const now = new Date();
    const due = new Date(dueDate);
    const diffDays = (due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);

    if (due < now) return urgencyColors.overdue;
    if (diffDays <= 7) return urgencyColors.weekly;
    if (diffDays <= 30) return urgencyColors.monthly;
    if (diffDays <= 90) return urgencyColors.quarterly;
    if (diffDays <= 180) return urgencyColors.sixMonths;
    return urgencyColors.yearly;
  };

  if (loading) {
    return <div style={{ padding: 128, textAlign: "center" }}>Loading...</div>;
  }

  return (
    <div
      style={{
        padding: 32,
        maxWidth: 1600,
        margin: "0 auto",
        fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
        color: "#1e293b",
        background: "#f8fafc",
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        gap: 24,
      }}
    >
      <header style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 40, color: "#334155", margin: 0 }}>
          AIIG Deliverables
        </h1>
        <p style={{ color: "#64748b", fontSize: 18, userSelect: "none" }}>
          Page {currentPage} of {totalPages} • {filteredDeliverables.length}{" "}
          matches
        </p>
      </header>

      <button
        onClick={() => setShowAddModal(true)}
        style={{
          alignSelf: "flex-start",
          padding: "12px 24px",
          background: "#3b82f6",
          color: "white",
          border: "none",
          borderRadius: 12,
          fontSize: 16,
          fontWeight: 600,
          cursor: "pointer",
          boxShadow: "0 4px 12px rgba(59, 130, 246, 0.3)",
        }}
      >
        Add Deliverable
      </button>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
          marginBottom: 16,
          maxWidth: 800,
          width: "100%",
        }}
      >
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search deliverables/projects/managers..."
          style={{
            flexGrow: 1,
            padding: "14px 18px",
            fontSize: 16,
            border: "2px solid #e2e8f0",
            borderRadius: 12,
            boxShadow: "0 4px 12px rgba(0,0,0,0.05)",
            outlineColor: "#3b82f6",
            backgroundColor: "#fafbff",
            color: "#1e293b",
            minWidth: 280,
            maxWidth: 600,
          }}
        />

        <select
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "white",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            color: "#334155",
            fontWeight: 600,
            fontSize: 15,
            minWidth: 180,
          }}
        >
          <option value="">All Projects</option>
          {projects.map((project) => (
            <option key={project.id} value={project.id.toString()}>
              {project.name}
            </option>
          ))}
        </select>

        <select
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
          style={{
            padding: "10px 18px",
            borderRadius: 8,
            border: "1px solid #cbd5e1",
            background: "white",
            cursor: "pointer",
            boxShadow: "0 1px 3px rgba(0,0,0,0.1)",
            color: "#334155",
            fontWeight: 600,
            fontSize: 15,
            minWidth: 160,
          }}
        >
          <option value="">All Dates</option>
          <option value="nextWeek">Next Week</option>
          <option value="nextMonth">Next Month</option>
          <option value="nextQuarter">Next Quarter</option>
          <option value="next6Months">Next 6 Months</option>
          <option value="nextYear">Next Year</option>
        </select>
      </div>

      {error && (
        <div
          style={{
            padding: 24,
            background: "#fee2e2",
            border: "2px solid #fecaca",
            borderRadius: 12,
            marginTop: 16,
            maxWidth: 800,
            width: "100%",
            color: "#991b1b",
          }}
        >
          {error}
        </div>
      )}
      <div
        style={{
          background: "white",
          borderRadius: 16,
          boxShadow: "0 10px 40px rgba(0,0,0,0.05)",
          overflow: "auto",
          border: "1px solid #cbd5e1",
          minHeight: 480,
          minWidth: 700,
        }}
      >
        <table
          style={{
            width: "100%",
            borderCollapse: "collapse",
            tableLayout: "fixed",
            minWidth: 700,
          }}
        >
          <thead>
            <tr style={{ background: "#e0e7ff" }}>
              <th
                style={{
                  padding: "20px 24px",
                  textAlign: "left",
                  borderBottom: "3px solid #c7d2fe",
                  fontWeight: 700,
                  width: "30%",
                  color: "#1e293b",
                }}
              >
                Deliverable
              </th>
              <th
                style={{
                  padding: "20px 24px",
                  textAlign: "left",
                  borderBottom: "3px solid #c7d2fe",
                  fontWeight: 700,
                  width: "20%",
                  color: "#1e293b",
                }}
              >
                Project
              </th>
              <th
                style={{
                  padding: "20px 24px",
                  textAlign: "left",
                  borderBottom: "3px solid #c7d2fe",
                  fontWeight: 700,
                  width: "15%",
                  color: "#1e293b",
                }}
              >
                Due
              </th>
              <th
                style={{
                  padding: "20px 24px",
                  textAlign: "left",
                  borderBottom: "3px solid #c7d2fe",
                  fontWeight: 700,
                  width: "15%",
                  color: "#1e293b",
                }}
              >
                Frequency
              </th>
              <th
                style={{
                  padding: "20px 24px",
                  textAlign: "left",
                  borderBottom: "3px solid #c7d2fe",
                  fontWeight: 700,
                  width: "20%",
                  color: "#1e293b",
                }}
              >
                Manager
              </th>
            </tr>
          </thead>
          <tbody>
            {currentDeliverables.length === 0 ? (
              <tr>
                <td
                  colSpan={5}
                  style={{ padding: 24, textAlign: "center", color: "#64748b" }}
                >
                  No deliverables found.
                </td>
              </tr>
            ) : (
              currentDeliverables.map((d) => {
                const urgencyBg = getUrgencyColor(d.dueDate);
                return (
                  <tr key={d.id} style={{ borderBottom: "1px solid #e2e8f0" }}>
                    <td
                      style={{
                        padding: "20px 24px",
                        fontWeight: 600,
                        color: "#334155",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={d.title}
                    >
                      {d.title}
                    </td>
                    <td
                      style={{
                        padding: "20px 24px",
                        fontWeight: 600,
                        color: "#3b82f6",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={d.project.name}
                    >
                      {d.project.name}
                    </td>
                    <td style={{ padding: "20px 24px" }}>
                      <div
                        style={{
                          display: "inline-block",
                          backgroundColor: urgencyBg,
                          borderRadius: 16,
                          padding: "6px 14px",
                          minWidth: 90,
                          textAlign: "center",
                          fontWeight: 600,
                          color: "#111827",
                          userSelect: "none",
                          fontSize: 14,
                        }}
                        title={`Due on ${new Date(d.dueDate).toLocaleDateString()}`}
                      >
                        {new Date(d.dueDate).toLocaleDateString()}
                      </div>
                    </td>
                    <td
                      style={{
                        padding: "20px 24px",
                        whiteSpace: "nowrap",
                      }}
                    >
                      <span
                        style={{
                          background: "#e0e7ff",
                          padding: "4px 12px",
                          borderRadius: 999,
                          fontSize: 14,
                          color: "#3730a3",
                          fontWeight: 600,
                          userSelect: "none",
                        }}
                      >
                        {d.frequency}
                      </span>
                    </td>
                    <td
                      style={{
                        padding: "20px 24px",
                        fontWeight: 500,
                        color: "#334155",
                        whiteSpace: "nowrap",
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                      }}
                      title={d.manager}
                    >
                      {d.manager}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            gap: 12,
            marginTop: 24,
            padding: "20px 0",
            background: "white",
            borderRadius: 12,
            boxShadow: "0 1px 4px rgb(0 0 0 / 0.05)",
            userSelect: "none",
          }}
        >
          <button
            onClick={prevPage}
            disabled={currentPage === 1}
            style={{
              padding: "10px 18px",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              background: currentPage === 1 ? "#f1f5f9" : "white",
              cursor: currentPage === 1 ? "not-allowed" : "pointer",
              color: currentPage === 1 ? "#94a3b8" : "#334155",
              fontWeight: 600,
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (currentPage !== 1)
                e.currentTarget.style.backgroundColor = "#e0e7ff";
            }}
            onMouseLeave={(e) => {
              if (currentPage !== 1)
                e.currentTarget.style.backgroundColor = "white";
            }}
          >
            ← Previous
          </button>

          <div
            style={{
              display: "flex",
              gap: 8,
              flexWrap: "wrap",
              maxWidth: 400,
              justifyContent: "center",
            }}
          >
            {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
              <button
                key={page}
                onClick={() => goToPage(page)}
                style={{
                  padding: "8px 14px",
                  border:
                    page === currentPage
                      ? "2px solid #3b82f6"
                      : "1px solid #cbd5e1",
                  borderRadius: 6,
                  background: page === currentPage ? "#3b82f6" : "white",
                  color: page === currentPage ? "white" : "#334155",
                  fontWeight: page === currentPage ? 700 : 500,
                  cursor: "pointer",
                  minWidth: 32,
                  textAlign: "center",
                  userSelect: "none",
                }}
              >
                {page}
              </button>
            ))}
          </div>

          <button
            onClick={nextPage}
            disabled={currentPage === totalPages}
            style={{
              padding: "10px 18px",
              border: "1px solid #cbd5e1",
              borderRadius: 8,
              background: currentPage === totalPages ? "#f1f5f9" : "white",
              cursor: currentPage === totalPages ? "not-allowed" : "pointer",
              color: currentPage === totalPages ? "#94a3b8" : "#334155",
              fontWeight: 600,
              transition: "background-color 0.15s ease",
            }}
            onMouseEnter={(e) => {
              if (currentPage !== totalPages)
                e.currentTarget.style.backgroundColor = "#e0e7ff";
            }}
            onMouseLeave={(e) => {
              if (currentPage !== totalPages)
                e.currentTarget.style.backgroundColor = "white";
            }}
          >
            Next →
          </button>
        </div>
      )}
      {/* Add Deliverable Modal */}
      {showAddModal && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0, 0, 0, 0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 1000,
          }}
          onClick={() => setShowAddModal(false)}
        >
          <div
            style={{
              background: "white",
              borderRadius: 16,
              padding: 32,
              maxWidth: 500,
              width: "90%",
              boxShadow: "0 20px 60px rgba(0,0,0,0.3)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2
              style={{ margin: "0 0 24px 0", color: "#334155", fontSize: 28 }}
            >
              Add New Deliverable
            </h2>

            <form
              onSubmit={handleSubmit}
              style={{ display: "flex", flexDirection: "column", gap: 20 }}
            >
              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    fontSize: 15,
                    color: "black",
                    backgroundColor: "white",
                  }}
                  placeholder="Enter deliverable title"
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  Project
                </label>
                <select
                  value={formData.projectId}
                  onChange={(e) =>
                    setFormData({ ...formData, projectId: e.target.value })
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    fontSize: 15,
                    cursor: "pointer",
                    color: "black",
                    backgroundColor: "white",
                  }}
                >
                  <option value="">Select a project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  Due Date
                </label>
                <input
                  type="date"
                  value={formData.dueDate}
                  onChange={(e) =>
                    setFormData({ ...formData, dueDate: e.target.value })
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    fontSize: 15,
                    cursor: "pointer",
                    color: "black",
                    backgroundColor: "white",
                  }}
                />
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  Frequency
                </label>
                <select
                  value={formData.frequency}
                  onChange={(e) =>
                    setFormData({ ...formData, frequency: e.target.value })
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    fontSize: 15,
                    cursor: "pointer",
                    color: "black",
                    backgroundColor: "white",
                  }}
                >
                  <option value="M">Monthly (M)</option>
                  <option value="Q">Quarterly (Q)</option>
                  <option value="SA">Semi-Annually (SA)</option>
                  <option value="A">Annually (A)</option>
                </select>
              </div>

              <div>
                <label
                  style={{
                    display: "block",
                    marginBottom: 8,
                    fontWeight: 600,
                    color: "#334155",
                  }}
                >
                  Manager
                </label>
                <input
                  type="text"
                  value={formData.manager}
                  onChange={(e) =>
                    setFormData({ ...formData, manager: e.target.value })
                  }
                  required
                  style={{
                    width: "100%",
                    padding: "12px",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    fontSize: 15,
                    color: "black",
                    backgroundColor: "white",
                  }}
                  placeholder="Enter manager name"
                />
              </div>

              <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    background: saving ? "#94a3b8" : "#3b82f6",
                    color: "white",
                    border: "none",
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving..." : "Add Deliverable"}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={saving}
                  style={{
                    flex: 1,
                    padding: "12px 24px",
                    background: "white",
                    color: "#334155",
                    border: "1px solid #cbd5e1",
                    borderRadius: 8,
                    fontSize: 16,
                    fontWeight: 600,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;