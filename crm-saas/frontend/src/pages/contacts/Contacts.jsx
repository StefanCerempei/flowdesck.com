import { useCallback, useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Plus, RefreshCw } from "lucide-react";
import axios from "axios";
import {
  PageHeader,
  ErrorNotice,
  Empty,
  Loading,
  Modal,
} from "../../components/RentalUI";
import { useLanguage } from "../../i18n";
import { euros } from "../../lib/api";

const statuses = { LEAD: "Prospect", ACTIVE: "Active", INACTIVE: "Inactive" };
const sources = {
  Google: "Google Search",
  Facebook: "Facebook Ads",
  LinkedIn: "LinkedIn",
  Recomandare: "Referral",
  "Cold Call": "Cold call",
  Altele: "Other",
};
const API_URL = `${import.meta.env.VITE_API_BASE_URL || ""}/api/contacts`;

const INITIAL_FORM = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  company: "",
  status: "LEAD",
  notes: "",
  potentialValue: "",
  source: "",
};

export default function Contacts() {
  const { t } = useLanguage();
  const [status, setStatus] = useState("");
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [editingId, setEditingId] = useState(null); // ID-ul clientului pe care îl edităm (null dacă adăugăm unul nou)
  const [searchTerm, setSearchTerm] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [formError, setFormError] = useState("");
  const [formData, setFormData] = useState(INITIAL_FORM);

  const getAxiosConfig = () => {
    const token = localStorage.getItem("token");
    return {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    };
  };

  const fetchContacts = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const response = await axios.get(API_URL, getAxiosConfig());
      setContacts(Array.isArray(response.data) ? response.data : []);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.eroare ||
          error.response?.data?.message ||
          "Nu am putut încărca lista de contacte. Verifică dacă serverul este pornit.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchContacts();
  }, [fetchContacts]);

  const filteredContacts = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();

    return contacts.filter((contact) => {
      if (status && contact.status !== status) return false;
      const searchableValues = [
        contact.firstName,
        contact.lastName,
        contact.email,
        contact.phone,
        contact.company,
        contact.status,
        t(statuses[contact.status]),
        contact.source,
        contact.notes,
      ];

      return searchableValues.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(normalizedSearch),
      );
    });
  }, [contacts, searchTerm, status, t]);

  const updateFormField = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setEditingId(null);
    setFormError("");
  };

  // Deschide modalul pentru adăugare nou client
  const openAddModal = () => {
    setEditingId(null);
    setFormData(INITIAL_FORM);
    setFormError("");
    setIsModalOpen(true);
  };

  // Deschide modalul pentru editarea unui client existent
  const openEditModal = (contact) => {
    setEditingId(contact.id);
    setFormData({
      firstName: contact.firstName || "",
      lastName: contact.lastName || "",
      email: contact.email || "",
      phone: contact.phone || "",
      company: contact.company || "",
      status: contact.status || "LEAD",
      notes: contact.notes || "",
      potentialValue: contact.potentialValue ?? "",
      source: contact.source || "",
    });
    setFormError("");
    setIsModalOpen(true);
  };

  // Salvează formularul (POST dacă e nou, PUT dacă are editingId)
  const handleSaveContact = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError("");

    try {
      if (editingId) {
        await axios.put(`${API_URL}/${editingId}`, formData, getAxiosConfig());
      } else {
        await axios.post(API_URL, formData, getAxiosConfig());
      }
      setIsModalOpen(false);
      setEditingId(null);
      setFormData(INITIAL_FORM);
      await fetchContacts();
    } catch (error) {
      setFormError(
        error.response?.data?.eroare ||
          error.response?.data?.message ||
          "Contactul nu a putut fi salvat. Verifică datele și încearcă din nou.",
      );
    } finally {
      setIsSaving(false);
    }
  };

  // Șterge un client
  const handleDeleteContact = async (id) => {
    if (!window.confirm(t("Delete this customer?"))) return;

    try {
      await axios.delete(`${API_URL}/${id}`, getAxiosConfig());
      await fetchContacts();
    } catch (error) {
      setErrorMessage(
        error.response?.data?.eroare || "Could not delete customer.",
      );
    }
  };

  return (
    <main className="dashboard-main r-page">
      <PageHeader
        title={t("Customers")}
        description={t(
          "Manage customer details and open their rental history.",
        )}
      >
        <button className="r-button" onClick={openAddModal}>
          <Plus size={18} />
          {t("Add customer")}
        </button>
      </PageHeader>
      <section className="r-panel">
        <div className="r-toolbar">
          <label>
            {t("Search customers")}
            <input
              type="search"
              value={searchTerm}
              placeholder={t("Name, phone or email")}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </label>
          <label>
            {t("Status")}
            <select
              aria-label={t("Status")}
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="">{t("All statuses")}</option>
              {Object.entries(statuses).map(([id, label]) => (
                <option key={id} value={id}>
                  {t(label)}
                </option>
              ))}
            </select>
          </label>
          <button
            className="r-button secondary"
            disabled={isLoading}
            onClick={fetchContacts}
          >
            <RefreshCw size={15} />
            {t("Refresh")}
          </button>
        </div>
        <ErrorNotice message={t(errorMessage)} />
        {isLoading ? (
          <Loading />
        ) : (
          !errorMessage &&
          (filteredContacts.length ? (
            <div className="r-table-wrap">
              <table className="r-table customer-table">
                <thead>
                  <tr>
                    {[
                      "Customer",
                      "Contact details",
                      "Status",
                      "Rental activity",
                      "Actions",
                    ].map((col) => (
                      <th key={col}>{t(col)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredContacts.map((c) => (
                    <tr key={c.id}>
                      <td>
                        <strong>
                          {c.firstName} {c.lastName}
                        </strong>
                        <small>{c.company}</small>
                        {c.notes && (
                          <small className="note-cell">{c.notes}</small>
                        )}
                      </td>
                      <td data-label={t("Contact details")}>
                        {c.email}
                        <small>{c.phone}</small>
                      </td>
                      <td data-label={t("Status")}>
                        <span className={"r-badge r-" + c.status}>
                          {t(statuses[c.status])}
                        </span>
                        <small>
                          {sources[c.source] ? t(sources[c.source]) : c.source}
                        </small>
                        {c.potentialValue != null && (
                          <small>
                            {t("Potential value")} · {euros(c.potentialValue)}
                          </small>
                        )}
                      </td>
                      <td data-label={t("Rental activity")}>
                        <Link
                          className="r-text-link"
                          to={"/reservations?contactId=" + c.id}
                        >
                          {t("Reservations")}
                        </Link>
                      </td>
                      <td>
                        <div className="r-actions">
                          <button
                            className="r-text-link"
                            onClick={() => openEditModal(c)}
                          >
                            {t("Edit")}
                          </button>
                          <button
                            className="r-text-link danger-link"
                            onClick={() => handleDeleteContact(c.id)}
                          >
                            {t("Delete")}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={t(
                contacts.length ? "No matching customers" : "No customers yet",
              )}
              description={t(
                contacts.length
                  ? "Try another search or status."
                  : "Add a customer to start booking rentals.",
              )}
            />
          ))
        )}
      </section>
      {isModalOpen && (
        <Modal
          title={t(editingId ? "Edit customer" : "Add customer")}
          onClose={closeModal}
          busy={isSaving}
        >
          <form className="r-form" onSubmit={handleSaveContact}>
            <div className="r-form-grid">
              {[
                ["firstName", "First name"],
                ["lastName", "Last name"],
                ["email", "Email", "email"],
                ["phone", "Phone", "tel"],
                ["company", "Company"],
                ["potentialValue", "Potential value (€)", "number"],
              ].map(([name, label, type]) => (
                <label key={name}>
                  {t(label)}
                  <input
                    name={name}
                    type={type || "text"}
                    required={["firstName", "lastName"].includes(name)}
                    min={type === "number" ? 0 : undefined}
                    step={type === "number" ? "any" : undefined}
                    value={formData[name]}
                    onChange={updateFormField}
                  />
                </label>
              ))}
              <label>
                {t("Status")}
                <select
                  name="status"
                  value={formData.status}
                  onChange={updateFormField}
                >
                  {Object.entries(statuses).map(([id, label]) => (
                    <option key={id} value={id}>
                      {t(label)}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                {t("Source")}
                <select
                  name="source"
                  value={formData.source}
                  onChange={updateFormField}
                >
                  <option value="">—</option>
                  {formData.source && !sources[formData.source] && (
                    <option>{formData.source}</option>
                  )}
                  {Object.entries(sources).map(([id, label]) => (
                    <option key={id} value={id}>
                      {t(label)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <label>
              {t("Notes")}
              <textarea
                name="notes"
                rows={3}
                value={formData.notes}
                onChange={updateFormField}
              />
            </label>
            <ErrorNotice message={t(formError)} />
            <footer className="r-form-footer">
              <button
                type="button"
                className="r-button secondary"
                disabled={isSaving}
                onClick={closeModal}
              >
                {t("Cancel")}
              </button>
              <button className="r-button" disabled={isSaving}>
                {t(isSaving ? "Saving…" : "Save customer")}
              </button>
            </footer>
          </form>
        </Modal>
      )}
    </main>
  );
}
