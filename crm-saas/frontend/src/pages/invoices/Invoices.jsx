import { useLanguage, currentLocale, localizedError } from "../../i18n";
import { useCallback, useEffect, useMemo, useState } from "react";

import { Plus, RefreshCw } from "lucide-react";

import axios from "axios";
import {
  PageHeader,
  Modal,
  ErrorNotice,
  Empty,
  Loading,
} from "../../components/RentalUI";
import { euros } from "../../lib/api";

const API_URL = `${import.meta.env.VITE_API_BASE_URL || ""}/api/invoices`;
const CONTACTS_API_URL = `${import.meta.env.VITE_API_BASE_URL || ""}/api/contacts`;

const INITIAL_FORM = {
  invoiceNumber: "",
  amount: "",
  status: "PENDING",
  dueDate: "",
  contactId: "",
};

export default function Invoices() {
  const { t: tr } = useLanguage();

  const [invoices, setInvoices] = useState([]);
  const [contacts, setContacts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
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

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");

    try {
      const [invoicesRes, contactsRes] = await Promise.all([
        axios.get(API_URL, getAxiosConfig()),
        axios.get(CONTACTS_API_URL, getAxiosConfig()),
      ]);
      setInvoices(Array.isArray(invoicesRes.data) ? invoicesRes.data : []);
      setContacts(Array.isArray(contactsRes.data) ? contactsRes.data : []);
    } catch (error) {
      setErrorMessage(
        error.response?.data?.message ||
          tr(
            "Nu am putut încărca facturile. Verifică dacă serverul este pornit.",
          ),
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredInvoices = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    if (!normalizedSearch) return invoices;

    return invoices.filter((inv) => {
      const clientName = inv.contact
        ? `${inv.contact.firstName} ${inv.contact.lastName}`
        : "";
      const searchableValues = [
        inv.invoiceNumber,
        inv.status,
        clientName,
        inv.amount.toString(),
      ];

      return searchableValues.some((value) =>
        String(value || "")
          .toLowerCase()
          .includes(normalizedSearch),
      );
    });
  }, [invoices, searchTerm]);

  const updateFormField = (event) => {
    const { name, value } = event.target;
    setFormData((current) => ({ ...current, [name]: value }));
  };

  const closeModal = () => {
    if (isSaving) return;
    setIsModalOpen(false);
    setFormError("");
  };

  const handleCreateInvoice = async (event) => {
    event.preventDefault();
    setIsSaving(true);
    setFormError("");

    // Pregătim datele: dacă contactId este gol, trimitem null
    const payload = {
      ...formData,
      amount: parseFloat(formData.amount),
      contactId: formData.contactId === "" ? null : formData.contactId,
    };

    try {
      await axios.post(API_URL, payload, getAxiosConfig());
      setIsModalOpen(false);
      setFormData(INITIAL_FORM);
      await fetchData();
    } catch (error) {
      setFormError(
        error.response?.data?.eroare ||
          error.response?.data?.message ||
          tr(
            "Factura nu a putut fi emisă. Verifică datele și încearcă din nou.",
          ),
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteInvoice = async (id) => {
    if (!window.confirm(tr("Ești sigur că vrei să ștergi această factură?")))
      return;

    try {
      await axios.delete(`${API_URL}/${id}`, getAxiosConfig());
      await fetchData();
    } catch (error) {
      alert(tr("Nu am putut șterge factura."));
    }
  };

  const statusLabels = {
    PAID: "Plătită",
    OVERDUE: "Scadentă",
    PENDING: "În așteptare",
  };
  const totalRevenue = invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  const pendingAmount = invoices
    .filter((inv) => inv.status === "PENDING" || inv.status === "OVERDUE")
    .reduce((sum, inv) => sum + Number(inv.amount), 0);

  return (
    <main className="dashboard-main r-page">
      <PageHeader
        title={tr("Facturi")}
        description={tr("Emite și gestionează facturile emise către clienți.")}
      >
        <button
          className="r-button"
          onClick={() => {
            setFormData(INITIAL_FORM);
            setFormError("");
            setIsModalOpen(true);
          }}
        >
          <Plus size={18} />
          {tr("Emite factură")}
        </button>
      </PageHeader>
      <section className="r-stats">
        {[
          ["Total facturi", invoices.length],
          ["Încasări totale (Plătite)", euros(totalRevenue)],
          ["De încasat (În așteptare)", euros(pendingAmount)],
        ].map(([label, value]) => (
          <div className="r-stat" key={label}>
            <span>{tr(label)}</span>
            <strong>{value}</strong>
          </div>
        ))}
      </section>
      <section className="r-panel">
        <div className="r-toolbar">
          <label>
            {tr("Caută facturi")}
            <input
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder={tr("Caută după număr, client, status...")}
            />
          </label>
          <button
            className="r-button secondary"
            disabled={isLoading}
            onClick={fetchData}
          >
            <RefreshCw size={16} />
            {tr("Reîncarcă")}
          </button>
        </div>
        <ErrorNotice message={errorMessage} />
        {isLoading ? (
          <Loading />
        ) : (
          !errorMessage &&
          (filteredInvoices.length ? (
            <div className="r-table-wrap">
              <table className="r-table">
                <thead>
                  <tr>
                    {[
                      "Factură",
                      "Client",
                      "Valoare",
                      "Scadență & Status",
                      "Acțiuni",
                    ].map((label) => (
                      <th key={label}>{tr(label)}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredInvoices.map((inv) => (
                    <tr key={inv.id}>
                      <td>
                        <strong>{inv.invoiceNumber}</strong>
                        <small>
                          {tr("Emisă la")}{" "}
                          {new Date(inv.createdAt).toLocaleDateString(
                            currentLocale(),
                          )}
                        </small>
                      </td>
                      <td>
                        {inv.contact
                          ? [inv.contact.firstName, inv.contact.lastName].join(
                              " ",
                            )
                          : tr("— Fără client asociat")}
                      </td>
                      <td>{euros(inv.amount)}</td>
                      <td>
                        <span className="r-badge">
                          {tr(statusLabels[inv.status])}
                        </span>
                        <small>{inv.dueDate}</small>
                      </td>
                      <td>
                        <button
                          className="r-text-link danger-link"
                          onClick={() => handleDeleteInvoice(inv.id)}
                        >
                          {tr("Șterge")}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <Empty
              title={tr(
                searchTerm
                  ? "Nu am găsit rezultate"
                  : "Nu ai emis încă nicio factură",
              )}
              description={tr(
                searchTerm
                  ? "Încearcă un alt termen de căutare."
                  : "Emite prima factură pentru a începe urmărirea încasărilor.",
              )}
            />
          ))
        )}
      </section>
      {isModalOpen && (
        <Modal
          title={tr("Emite o factură nouă")}
          busy={isSaving}
          onClose={closeModal}
        >
          <form onSubmit={handleCreateInvoice} className="r-form">
            <div className="r-form-grid">
              <label className="contacts-field">
                <span>
                  {tr("Număr factură")} <b>*</b>
                </span>
                <input
                  name="invoiceNumber"
                  value={formData.invoiceNumber}
                  onChange={updateFormField}
                  placeholder={tr("Ex. INV-2026-001")}
                  required
                />
              </label>
              <label className="contacts-field">
                <span>
                  {tr("Sumă (€)")} <b>*</b>
                </span>
                <input
                  name="amount"
                  type="number"
                  min="0"
                  step="any"
                  value={formData.amount}
                  onChange={updateFormField}
                  placeholder={tr("Ex. 1500")}
                  required
                />
              </label>
            </div>

            <div className="r-form-grid" style={{ marginTop: "12px" }}>
              <label className="contacts-field">
                <span>{tr("Status factură")}</span>
                <select
                  name="status"
                  value={formData.status}
                  onChange={updateFormField}
                >
                  <option value="PENDING">
                    {tr("În așteptare (Pending)")}
                  </option>
                  <option value="PAID">{tr("Plătită (Paid)")}</option>
                  <option value="OVERDUE">{tr("Scadentă (Overdue)")}</option>
                </select>
              </label>
              <label className="contacts-field">
                <span>{tr("Data scadenței")}</span>
                <input
                  name="dueDate"
                  type="date"
                  value={formData.dueDate}
                  onChange={updateFormField}
                />
              </label>
            </div>

            <label className="contacts-field" style={{ marginTop: "12px" }}>
              <span>
                {tr("Client asociat")} <small>{tr("OPȚIONAL")}</small>
              </span>
              <select
                name="contactId"
                value={formData.contactId}
                onChange={updateFormField}
              >
                <option value="">{tr("Selectează clientul...")}</option>
                {contacts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.firstName} {c.lastName}{" "}
                    {c.company ? `(${c.company})` : ""}
                  </option>
                ))}
              </select>
            </label>

            {formError && (
              <div className="r-error">{localizedError(formError)}</div>
            )}

            <div className="r-form-footer">
              <button
                type="button"
                className="r-button secondary"
                onClick={closeModal}
                disabled={isSaving}
              >
                {tr("Anulează")}
              </button>
              <button type="submit" className="r-button" disabled={isSaving}>
                {isSaving ? (
                  tr("Se emite...")
                ) : (
                  <>
                    <Plus size={16} /> {tr("Emite factura")}
                  </>
                )}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </main>
  );
}
