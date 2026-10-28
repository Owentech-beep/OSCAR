
  (() => {
    const csrfToken = document.getElementById("csrfToken").value;
    const tableBody = document.getElementById("invoicesTableBody");
    const searchInput = document.getElementById("invoiceSearch");
    const statusFilter = document.getElementById("invoiceStatusFilter");
    const paginationInfo = document.getElementById("invoicePaginationInfo");
    const invoiceForm = document.getElementById("invoiceForm");
    const invoiceModal = document.getElementById("invoiceModal");
    const itemsBody = document.getElementById("invoiceItemsBody");
    const alertBox = document.getElementById("invoiceAlert");

    let page = 1;
    let totalPages = 1;
    let searchTimer;

    const money = (value, currency = "ZAR") =>
      new Intl.NumberFormat("en-ZA", { style: "currency", currency }).format(
        Number(value) || 0,
      );

    const dateText = (value) => {
      if (!value) return "—";
      const date = new Date(value);
      return Number.isNaN(date.getTime())
        ? "—"
        : date.toLocaleDateString("en-ZA");
    };

    function escapeHtml(value) {
      return String(value ?? "").replace(
        /[&<>"']/g,
        (char) =>
          ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#39;",
          })[char],
      );
    }

    function showAlert(message, type = "danger") {
      alertBox.className = `alert alert-${type}`;
      alertBox.textContent = message;
      alertBox.scrollIntoView({ behavior: "smooth", block: "nearest" });
    }

    function clearAlert() {
      alertBox.className = "alert d-none";
      alertBox.textContent = "";
    }

    async function apiRequest(url, options = {}) {
      const response = await fetch(url, {
        credentials: "same-origin",
        ...options,
        headers: {
          ...(options.body ? { "Content-Type": "application/json" } : {}),
          ...(options.method && options.method !== "GET"
            ? { "x-csrf-token": csrfToken }
            : {}),
          ...options.headers,
        },
      });

      const result = await response.json().catch(() => ({}));

      if (!response.ok || result.success === false) {
        throw new Error(result.error || `Request failed (${response.status}).`);
      }

      return result.data;
    }

    function getStatusBadge(status) {
      const classes = {
        Draft: "bg-secondary",
        Sent: "bg-primary",
        Paid: "bg-success",
        Overdue: "bg-danger",
        Cancelled: "bg-dark",
      };
      const className = classes[status] || "bg-secondary";
      return `<span class="badge ${className}">${escapeHtml(status || "Unknown")}</span>`;
    }

    function renderInvoiceRow(invoice) {
      const id = escapeHtml(invoice._id);
      const clientName =
        invoice.client?.companyName ||
        invoice.client?.contactName ||
        "Unknown client";
      const status = invoice.status;
      const actions = [];

      if (status === "Draft") {
        actions.push(
          `<button class="btn btn-sm btn-outline-light" data-invoice-action="edit" data-id="${id}">Edit</button>`,
        );
        actions.push(
          `<button class="btn btn-sm btn-outline-light" data-invoice-action="send" data-id="${id}">Mark Sent</button>`,
        );
      }

      if (status === "Sent" || status === "Overdue") {
        actions.push(
          `<button class="btn btn-sm btn-outline-success" data-invoice-action="pay" data-id="${id}">Mark Paid</button>`,
        );
      }

      if (status !== "Paid" && status !== "Cancelled") {
        actions.push(
          `<button class="btn btn-sm btn-outline-danger" data-invoice-action="cancel" data-id="${id}">Cancel</button>`,
        );
      }

      return `<tr>
      <td><strong>${escapeHtml(invoice.invoiceNumber)}</strong><div class="small text-muted">${escapeHtml(invoice.currency || "ZAR")}</div></td>
      <td>${escapeHtml(clientName)}</td>
      <td>${dateText(invoice.issueDate)}</td>
      <td>${dateText(invoice.dueDate)}</td>
      <td class="text-nowrap">${money(invoice.total, invoice.currency || "ZAR")}</td>
      <td>${getStatusBadge(status)}</td>
      <td><div class="d-flex flex-wrap justify-content-end gap-1">${actions.join("") || '<span class="text-muted">No actions</span>'}</div></td>
    </tr>`;
    }

    async function loadInvoices() {
      clearAlert();
      tableBody.innerHTML =
        '<tr><td colspan="7" class="text-center text-muted py-5">Loading invoices...</td></tr>';

      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
        search: searchInput.value.trim(),
        status: statusFilter.value,
      });

      try {
        const result = await apiRequest(`/api/invoices?${params}`);
        const invoices = result.invoices || [];
        const pagination = result.pagination || {};

        totalPages = Math.max(1, pagination.totalPages || 1);
        page = pagination.page || page;

        tableBody.innerHTML = invoices.length
          ? invoices.map(renderInvoiceRow).join("")
          : '<tr><td colspan="7" class="text-center text-muted py-5">No invoices found.</td></tr>';

        paginationInfo.textContent = `Page ${page} of ${totalPages} · ${pagination.total || 0} invoices`;
        document.getElementById("previousInvoicePage").disabled = page <= 1;
        document.getElementById("nextInvoicePage").disabled =
          page >= totalPages;

        // Summary counts come from all matching database records, not just this page.
        await loadInvoiceSummary();
      } catch (error) {
        tableBody.innerHTML =
          '<tr><td colspan="7" class="text-center text-danger py-5">Could not load invoices.</td></tr>';
        showAlert(error.message);
      }
    }

    async function loadInvoiceSummary() {
      try {
        const summary = await apiRequest("/api/invoices/summary");

        document.getElementById("totalInvoices").textContent =
          summary.totalInvoices;

        document.getElementById("paidInvoices").textContent = summary.paidCount;

        document.getElementById("paidAmount").textContent = money(
          summary.paidAmount,
        );

        document.getElementById("outstandingAmount").textContent = money(
          summary.outstandingAmount,
        );

        document.getElementById("outstandingCount").textContent =
          `${summary.outstandingCount} unpaid invoices`;

        document.getElementById("overdueInvoices").textContent =
          summary.overdueCount;

        document.getElementById("overdueAmount").textContent = money(
          summary.overdueAmount,
        );
      } catch (error) {
        console.error("Could not load invoice summary:", error);

        document.getElementById("totalInvoices").textContent = "—";
        document.getElementById("paidInvoices").textContent = "—";
        document.getElementById("paidAmount").textContent = "Unavailable";
        document.getElementById("outstandingAmount").textContent = "—";
        document.getElementById("outstandingCount").textContent = "Unavailable";
        document.getElementById("overdueInvoices").textContent = "—";
        document.getElementById("overdueAmount").textContent = "Unavailable";
      }
    }

    async function loadClients() {
      const select = document.getElementById("invoiceClient");
      select.innerHTML = '<option value="">Loading clients...</option>';

      const result = await apiRequest("/api/clients?limit=100");
      const clients = result.clients || [];

      select.innerHTML =
        '<option value="">Choose a client...</option>' +
        clients
          .map(
            (client) =>
              `<option value="${escapeHtml(client._id)}">${escapeHtml(client.companyName || client.contactName || "Unnamed client")}</option>`,
          )
          .join("");

      if (!clients.length) {
        select.innerHTML =
          '<option value="">No clients available — create a client first</option>';
      }
    }

    function addItemRow(item = {}) {
      const row = document.createElement("tr");
      row.innerHTML = `
      <td><input class="form-control item-description" required maxlength="250" placeholder="Service or product" value="${escapeHtml(item.description || "")}"></td>
      <td><input type="number" class="form-control item-quantity" required min="0.01" step="0.01" value="${escapeHtml(item.quantity ?? 1)}"></td>
      <td><input type="number" class="form-control item-price" required min="0" step="0.01" value="${escapeHtml(item.unitPrice ?? 0)}"></td>
      <td class="item-amount text-nowrap">R 0.00</td>
      <td><button type="button" class="btn btn-sm btn-outline-danger remove-item" aria-label="Remove item"><i class="bi bi-trash"></i></button></td>
    `;
      itemsBody.appendChild(row);
      row
        .querySelectorAll("input")
        .forEach((input) =>
          input.addEventListener("input", calculateFormTotals),
        );
      row.querySelector(".remove-item").addEventListener("click", () => {
        if (itemsBody.children.length === 1) {
          showAlert(
            "An invoice must contain at least one line item.",
            "warning",
          );
          return;
        }
        row.remove();
        calculateFormTotals();
      });
      calculateFormTotals();
    }

    function calculateFormTotals() {
      let subtotal = 0;

      for (const row of itemsBody.querySelectorAll("tr")) {
        const quantity = Number(row.querySelector(".item-quantity").value);
        const price = Number(row.querySelector(".item-price").value);
        const amount = Number.isFinite(quantity * price)
          ? Math.round(quantity * price * 100) / 100
          : 0;
        subtotal += amount;
        row.querySelector(".item-amount").textContent = money(amount);
      }

      subtotal = Math.round(subtotal * 100) / 100;
      const taxRate =
        Number(document.getElementById("invoiceTaxRate").value) || 0;
      const tax = Math.round(subtotal * taxRate) / 100;

      document.getElementById("invoiceSubtotal").textContent = money(subtotal);
      document.getElementById("invoiceTax").textContent = money(tax);
      document.getElementById("invoiceTotal").textContent = money(
        subtotal + tax,
      );
    }

    function resetInvoiceForm() {
      invoiceForm.reset();
      itemsBody.innerHTML = "";
      addItemRow();
      const today = new Date();
      const localToday = new Date(
        today.getTime() - today.getTimezoneOffset() * 60000,
      )
        .toISOString()
        .slice(0, 10);
      document.getElementById("invoiceIssueDate").value = localToday;
      document.getElementById("invoiceDueDate").value = localToday;
      document.getElementById("invoiceTaxRate").value = "0";
      calculateFormTotals();
    }

    async function createInvoice(event) {
      event.preventDefault();
      clearAlert();

      const button = document.getElementById("saveInvoiceButton");
      const items = [...itemsBody.querySelectorAll("tr")].map((row) => ({
        description: row.querySelector(".item-description").value.trim(),
        quantity: Number(row.querySelector(".item-quantity").value),
        unitPrice: Number(row.querySelector(".item-price").value),
      }));

      if (
        !items.length ||
        items.some(
          (item) =>
            !item.description ||
            !Number.isFinite(item.quantity) ||
            item.quantity <= 0 ||
            !Number.isFinite(item.unitPrice) ||
            item.unitPrice < 0,
        )
      ) {
        showAlert(
          "Check your line items. Each needs a description, positive quantity, and non-negative price.",
        );
        return;
      }

      const issueDate = document.getElementById("invoiceIssueDate").value;
      const dueDate = document.getElementById("invoiceDueDate").value;

      if (dueDate < issueDate) {
        showAlert("The due date cannot be before the issue date.");
        return;
      }

      const payload = {
        invoiceNumber: document.getElementById("invoiceNumber").value.trim(),
        clientId: document.getElementById("invoiceClient").value,
        issueDate,
        dueDate,
        taxRate: Number(document.getElementById("invoiceTaxRate").value),
        currency: "ZAR",
        notes: document.getElementById("invoiceNotes").value.trim(),
        items,
      };

      button.disabled = true;
      button.textContent = "Saving...";

      try {
        await apiRequest("/api/invoices", {
          method: "POST",
          body: JSON.stringify(payload),
        });

        bootstrap.Modal.getOrCreateInstance(invoiceModal).hide();
        resetInvoiceForm();
        page = 1;
        showAlert("Invoice draft created successfully.", "success");
        await loadInvoices();
      } catch (error) {
        showAlert(error.message);
      } finally {
        button.disabled = false;
        button.textContent = "Save Draft";
      }
    }

    async function performInvoiceAction(action, id) {
      const messages = {
        send: "Mark this invoice as sent?",
        pay: "Confirm that payment has been received and mark this invoice as paid?",
        cancel: "Cancel this invoice? This cannot be undone.",
      };

      if (!messages[action]) return;

      if (!window.confirm(messages[action])) return;

      try {
        await apiRequest(`/api/invoices/${encodeURIComponent(id)}/${action}`, {
          method: "POST",
          body: JSON.stringify({}),
        });

        showAlert("Invoice updated successfully.", "success");
        await loadInvoices();
      } catch (error) {
        showAlert(error.message);
      }
    }

    tableBody.addEventListener("click", async (event) => {
      const button = event.target.closest("[data-invoice-action]");
      if (!button) return;

      const action = button.dataset.invoiceAction;
      const id = button.dataset.id;

      if (action === "edit") {
        showAlert(
          "Invoice editing is the next step. Existing invoices have not been changed.",
          "info",
        );
        return;
      }

      await performInvoiceAction(action, id);
    });

    document
      .getElementById("createInvoiceButton")
      .addEventListener("click", async () => {
        clearAlert();
        resetInvoiceForm();

        try {
          await loadClients();
        } catch (error) {
          showAlert(`Unable to load clients: ${error.message}`);
        }
      });

    document
      .getElementById("addInvoiceItem")
      .addEventListener("click", () => addItemRow());
    document
      .getElementById("invoiceTaxRate")
      .addEventListener("input", calculateFormTotals);
    invoiceForm.addEventListener("submit", createInvoice);

    document.getElementById("refreshInvoices").addEventListener("click", () => {
      page = 1;
      loadInvoices();
    });

    searchInput.addEventListener("input", () => {
      clearTimeout(searchTimer);
      searchTimer = setTimeout(() => {
        page = 1;
        loadInvoices();
      }, 300);
    });

    statusFilter.addEventListener("change", () => {
      page = 1;
      loadInvoices();
    });

    document
      .getElementById("previousInvoicePage")
      .addEventListener("click", () => {
        if (page > 1) {
          page--;
          loadInvoices();
        }
      });

    document.getElementById("nextInvoicePage").addEventListener("click", () => {
      if (page < totalPages) {
        page++;
        loadInvoices();
      }
    });

    addItemRow();
    loadInvoices();
  })();
