(() => {
  const STORAGE_KEY = "kn-contracts-v1";

  const BILLING_OPTIONS = [
    { value: "paid-in-full", label: "Paid In Full" },
    { value: "monthly", label: "Monthly" }
  ];
  const PAYMENT_OPTIONS = [
    { value: "due-upon-receipt", label: "DUE UPON RECEIPT" },
    { value: "net-30", label: "NET 30" }
  ];
  const STATUS_OPTIONS = [
    { value: "onboarded", label: "Admin Onboard Successfully" },
    { value: "pending", label: "Pending Review" },
    { value: "expired", label: "Expired" }
  ];
  const COUNTRY_OPTIONS = [{ value: "US", label: "US - United States" }, { value: "CA", label: "CA - Canada" }];
  const TYPE_OPTIONS = [{ value: "importer-exporter", label: "IMPORTER/EXPORTER" }, { value: "broker", label: "BROKER" }];

  const state = {
    sortKey: "contractId",
    sortDir: "asc",
    page: 1,
    pageSize: 10,
    filters: {
      contractId: "",
      customerId: "",
      customerName: "",
      country: "",
      customerType: "",
      createdDate: "",
      effectiveDate: "",
      expirationDate: "",
      lastModifiedBy: "",
      lastModified: "",
      billingPreference: "",
      paymentTerm: "",
      productService: "",
      status: ""
    },
    selectOpen: "",
    detailId: ""
  };

  function escapeHtml(value) {
    return window.KNAdminUX?.escapeHtml?.(value) ?? String(value ?? "");
  }

  function dash(value) {
    const text = String(value ?? "").trim();
    return text ? escapeHtml(text) : "—";
  }

  function q(value) {
    return String(value || "").trim().toLowerCase();
  }

  function seedContracts() {
    const contact = {
      firstName: "Jason",
      lastName: "Measures",
      phone: "+14043125730",
      email: "jason.measures05@klearnow.com"
    };
    const products = [
      "Customs Engine",
      "Data Engine",
      "KlearHub",
      "KlearHub+",
      "Klear 360",
      "360",
      "Post Summary Correction"
    ];
    const credits = [
      { country: "ALL", type: "Ingestion Service", additionalRule: false, credit: "1" },
      { country: "ALL", type: "Entry Service", additionalRule: true, credit: "Rules Created" },
      { country: "ALL", type: "Isf Service", additionalRule: false, credit: "1" },
      { country: "ALL", type: "Inbond Service", additionalRule: false, credit: "1" },
      { country: "ALL", type: "Delivery Order", additionalRule: false, credit: "1" },
      { country: "ALL", type: "Ingestion-Per Additional Invoice", additionalRule: false, credit: "1" },
      { country: "ALL", type: "KlearHub 360", additionalRule: false, credit: "50" }
    ];
    return [
      {
        id: "contract-757",
        contractId: "CON757",
        customerId: "CUS68354735",
        customerName: "KlearNow Corporation",
        country: "US",
        countryLabel: "US - United States",
        customerType: "importer-exporter",
        customerTypeLabel: "IMPORTER/EXPORTER",
        createdDate: "Jul 18, 2024",
        effectiveDate: "Jul 18, 2024",
        expirationDate: "Jul 17, 2027",
        lastModifiedBy: "admin@klearexpress.com",
        lastModified: "May 19, 2026",
        billingPreference: "paid-in-full",
        billingPreferenceLabel: "Paid In Full",
        paymentTerm: "due-upon-receipt",
        paymentTermLabel: "DUE UPON RECEIPT",
        products,
        productsLabel: products.join(", "),
        status: "onboarded",
        statusLabel: "Admin Onboard Successfully",
        address: "3495 Freedom Circle Suite 400",
        city: "Santa Clara",
        state: "CA",
        zip: "94586",
        primaryContact: contact,
        renewalContact: contact,
        financeContact: contact,
        invoiceRecipients: [],
        contractTerm: "3",
        billingTerm: "Paid In Full",
        annualCommitmentCurrency: "US Dollar",
        annualCommitmentAmount: "400000",
        remarks: "—",
        firstInvoiceAmount: "400000",
        creditsPurchased: "800000",
        bonusCreditsOffered: "—",
        credits,
        documents: {
          pricingSheet: "",
          msa: "",
          sow: "",
          other: ""
        }
      },
      {
        id: "contract-612",
        contractId: "CON612",
        customerId: "CUS44120988",
        customerName: "Bosch North America",
        country: "US",
        countryLabel: "US - United States",
        customerType: "importer-exporter",
        customerTypeLabel: "IMPORTER/EXPORTER",
        createdDate: "Mar 4, 2025",
        effectiveDate: "Mar 4, 2025",
        expirationDate: "Mar 3, 2028",
        lastModifiedBy: "tanya.agrawal@klearnow.com",
        lastModified: "Aug 12, 2026",
        billingPreference: "monthly",
        billingPreferenceLabel: "Monthly",
        paymentTerm: "net-30",
        paymentTermLabel: "NET 30",
        products: ["Customs Engine", "KlearHub", "Data Engine"],
        productsLabel: "Customs Engine, KlearHub, Data Engine",
        status: "onboarded",
        statusLabel: "Admin Onboard Successfully",
        address: "38000 Hills Tech Drive",
        city: "Farmington Hills",
        state: "MI",
        zip: "48331",
        primaryContact: {
          firstName: "Elena",
          lastName: "Morales",
          phone: "+12485550192",
          email: "elena.morales@bosch.com"
        },
        renewalContact: {
          firstName: "Elena",
          lastName: "Morales",
          phone: "+12485550192",
          email: "elena.morales@bosch.com"
        },
        financeContact: {
          firstName: "Marcus",
          lastName: "Chen",
          phone: "+12485550144",
          email: "marcus.chen@bosch.com"
        },
        invoiceRecipients: [{ name: "AP Shared Services", email: "ap-shared@bosch.com" }],
        contractTerm: "3",
        billingTerm: "Monthly",
        annualCommitmentCurrency: "US Dollar",
        annualCommitmentAmount: "250000",
        remarks: "Renewal review scheduled Q2 2027",
        firstInvoiceAmount: "75000",
        creditsPurchased: "500000",
        bonusCreditsOffered: "25000",
        credits: [
          { country: "ALL", type: "Entry Service", additionalRule: true, credit: "Rules Created" },
          { country: "ALL", type: "Isf Service", additionalRule: false, credit: "1" },
          { country: "ALL", type: "KlearHub 360", additionalRule: false, credit: "25" }
        ],
        documents: {
          pricingSheet: "Bosch-Pricing-2025.pdf",
          msa: "Bosch-MSA-signed.pdf",
          sow: "",
          other: ""
        }
      },
      {
        id: "contract-489",
        contractId: "CON489",
        customerId: "CUS90211403",
        customerName: "Expeditors International",
        country: "US",
        countryLabel: "US - United States",
        customerType: "broker",
        customerTypeLabel: "BROKER",
        createdDate: "Jan 9, 2024",
        effectiveDate: "Jan 9, 2024",
        expirationDate: "Jan 8, 2025",
        lastModifiedBy: "priya.sharma@klearnow.com",
        lastModified: "Feb 2, 2025",
        billingPreference: "paid-in-full",
        billingPreferenceLabel: "Paid In Full",
        paymentTerm: "due-upon-receipt",
        paymentTermLabel: "DUE UPON RECEIPT",
        products: ["Customs Engine", "KlearHub+"],
        productsLabel: "Customs Engine, KlearHub+",
        status: "expired",
        statusLabel: "Expired",
        address: "1015 Third Avenue",
        city: "Seattle",
        state: "WA",
        zip: "98104",
        primaryContact: {
          firstName: "Noah",
          lastName: "Patel",
          phone: "+12065550108",
          email: "noah.patel@expeditors.com"
        },
        renewalContact: {
          firstName: "Noah",
          lastName: "Patel",
          phone: "+12065550108",
          email: "noah.patel@expeditors.com"
        },
        financeContact: {
          firstName: "Noah",
          lastName: "Patel",
          phone: "+12065550108",
          email: "noah.patel@expeditors.com"
        },
        invoiceRecipients: [],
        contractTerm: "1",
        billingTerm: "Paid In Full",
        annualCommitmentCurrency: "US Dollar",
        annualCommitmentAmount: "120000",
        remarks: "Expired — renewal in progress",
        firstInvoiceAmount: "120000",
        creditsPurchased: "240000",
        bonusCreditsOffered: "—",
        credits: [
          { country: "ALL", type: "Ingestion Service", additionalRule: false, credit: "1" },
          { country: "ALL", type: "Delivery Order", additionalRule: false, credit: "1" }
        ],
        documents: {
          pricingSheet: "",
          msa: "Expeditors-MSA.pdf",
          sow: "Expeditors-SOW-2024.pdf",
          other: ""
        }
      }
    ];
  }

  function loadContracts() {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        const seeded = seedContracts();
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
        return seeded;
      }
      return JSON.parse(raw);
    } catch (error) {
      return seedContracts();
    }
  }

  function routeHash(hash) {
    if (hash != null && hash !== "") {
      return String(hash).split("?")[0];
    }
    if (typeof window.getHashPath === "function") {
      return window.getHashPath();
    }
    return (location.hash || "#dashboard").split("?")[0];
  }

  function parseRoute(hash) {
    const path = routeHash(hash);
    const detail = path.match(/^#contract-management\/([^/?#]+)$/);
    if (detail) {
      return { view: "detail", id: decodeURIComponent(detail[1]) };
    }
    if (path === "#contract-management") {
      return { view: "list", id: "" };
    }
    return { view: "list", id: "" };
  }

  function findContract(id) {
    return loadContracts().find((item) => item.id === id);
  }

  function goto(hash) {
    if (location.hash === hash) {
      render();
      return;
    }
    location.hash = hash;
  }

  function hasListFilters() {
    return Object.values(state.filters).some((value) => String(value || "").trim());
  }

  function clearFilters() {
    state.filters = {
      contractId: "",
      customerId: "",
      customerName: "",
      country: "",
      customerType: "",
      createdDate: "",
      effectiveDate: "",
      expirationDate: "",
      lastModifiedBy: "",
      lastModified: "",
      billingPreference: "",
      paymentTerm: "",
      productService: "",
      status: ""
    };
    state.page = 1;
    render();
  }

  function filteredContracts() {
    const rows = loadContracts().filter((row) => {
      const f = state.filters;
      const hay = (keys) => keys.map((key) => q(row[key])).join(" ");
      return (
        (!f.contractId || hay(["contractId"]).includes(q(f.contractId))) &&
        (!f.customerId || hay(["customerId"]).includes(q(f.customerId))) &&
        (!f.customerName || hay(["customerName"]).includes(q(f.customerName))) &&
        (!f.country || row.country === f.country || q(row.countryLabel).includes(q(f.country))) &&
        (!f.customerType || row.customerType === f.customerType || q(row.customerTypeLabel).includes(q(f.customerType))) &&
        (!f.createdDate || q(row.createdDate).includes(q(f.createdDate))) &&
        (!f.effectiveDate || q(row.effectiveDate).includes(q(f.effectiveDate))) &&
        (!f.expirationDate || q(row.expirationDate).includes(q(f.expirationDate))) &&
        (!f.lastModifiedBy || q(row.lastModifiedBy).includes(q(f.lastModifiedBy))) &&
        (!f.lastModified || q(row.lastModified).includes(q(f.lastModified))) &&
        (!f.billingPreference || row.billingPreference === f.billingPreference) &&
        (!f.paymentTerm || row.paymentTerm === f.paymentTerm) &&
        (!f.productService || q(row.productsLabel).includes(q(f.productService))) &&
        (!f.status || row.status === f.status)
      );
    });
    const dir = state.sortDir === "desc" ? -1 : 1;
    rows.sort((a, b) => {
      const av = String(a[state.sortKey] || "").toLowerCase();
      const bv = String(b[state.sortKey] || "").toLowerCase();
      if (av < bv) return -1 * dir;
      if (av > bv) return 1 * dir;
      return 0;
    });
    return rows;
  }

  function sortHeader(key, label) {
    return window.KNAdminUX.sortHeader({
      key,
      label,
      sortKey: state.sortKey,
      sortDir: state.sortDir,
      attr: "data-contract-sort"
    });
  }

  function adminSelect(opts) {
    return window.KNAdminUX.select({
      open: state.selectOpen,
      ...opts
    });
  }

  function displayField(label, value) {
    return `<div class="form-display-field">
      <span class="form-display-field__label">${escapeHtml(label)}</span>
      <span class="form-display-field__value">${value}</span>
    </div>`;
  }

  function contactFields(contact) {
    if (!contact) {
      return displayField("Contact", "—");
    }
    return `<div class="contract-contact-grid">
      ${displayField("First Name", dash(contact.firstName))}
      ${displayField("Last Name", dash(contact.lastName))}
      ${displayField("Phone Number", dash(contact.phone))}
      ${displayField("Email", dash(contact.email))}
    </div>`;
  }

  function documentField(label, value) {
    const text = String(value || "").trim();
    const content = text
      ? `<a class="kn-link type-body-sm" href="#" onclick="event.preventDefault()">${escapeHtml(text)}</a>`
      : "—";
    return displayField(label, content);
  }

  function renderCreditsTable(credits) {
    if (!credits?.length) {
      return `<p class="type-caption-sm kn-field__hint">No transaction credits configured.</p>`;
    }
    return `<div class="contract-credits-table-wrap">
      <table class="vis-table contract-credits-table" aria-label="Credits for each transaction type">
        <thead>
          <tr class="vis-table__labels">
            <th scope="col"><span class="type-caption-sm type-weight-medium">Country</span></th>
            <th scope="col"><span class="type-caption-sm type-weight-medium">Transaction Type</span></th>
            <th scope="col"><span class="type-caption-sm type-weight-medium">Additional Rule</span></th>
            <th scope="col"><span class="type-caption-sm type-weight-medium">Transaction Credit</span></th>
          </tr>
        </thead>
        <tbody>
          ${credits
            .map(
              (row) => `<tr>
            <td class="type-body-sm">${dash(row.country)}</td>
            <td class="type-body-sm">${dash(row.type)}</td>
            <td class="type-body-sm">${row.additionalRule ? "Yes" : "No"}</td>
            <td class="type-body-sm">${row.credit === "Rules Created" ? `<span class="contract-credits-rules">${dash(row.credit)} <svg viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true" width="14" height="14"><path d="M3.5 8.5 6.5 11.5 12.5 4.5"/></svg></span>` : dash(row.credit)}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
  }

  function renderInvoiceRecipients(recipients) {
    if (!recipients?.length) {
      return `<p class="type-caption-sm kn-field__hint">No invoice recipients found.</p>`;
    }
    return `<div class="contract-credits-table-wrap">
      <table class="vis-table contract-credits-table" aria-label="Additional invoice recipients">
        <thead>
          <tr class="vis-table__labels">
            <th scope="col"><span class="type-caption-sm type-weight-medium">Name</span></th>
            <th scope="col"><span class="type-caption-sm type-weight-medium">Email</span></th>
          </tr>
        </thead>
        <tbody>
          ${recipients
            .map(
              (row) => `<tr>
            <td class="type-body-sm">${dash(row.name)}</td>
            <td class="type-body-sm">${dash(row.email)}</td>
          </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>`;
  }

  function renderDetailDrawer(contract) {
    if (!contract) {
      return "";
    }
    const statusTone =
      contract.status === "expired" ? "negative" : contract.status === "pending" ? "notice" : "positive";
    return `<div class="kn-drawer-root admin-profile-drawer contract-detail-drawer is-open" id="admin-contract-drawer">
      <div class="kn-drawer__overlay" data-contract-close tabindex="-1"></div>
      <aside class="kn-drawer kn-drawer--wide" role="dialog" aria-modal="true" aria-labelledby="kn-contract-drawer-title">
        <header class="kn-drawer__header">
          <div class="kn-drawer__titles">
            <div class="admin-drawer-title-row">
              <h2 class="type-heading-h5 type-weight-semibold" id="kn-contract-drawer-title" tabindex="-1">${escapeHtml(contract.contractId)}</h2>
              <span class="badge badge--${statusTone} type-caption-sm type-weight-medium kn-badge">${escapeHtml(contract.statusLabel)}</span>
            </div>
            <p class="type-caption-sm kn-field__hint">${escapeHtml(contract.customerName)} · ${escapeHtml(contract.customerId)}</p>
          </div>
          <button class="icon-btn" type="button" data-contract-close aria-label="Close contract details">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18"/></svg>
          </button>
        </header>
        <div class="kn-drawer__body contract-detail-form kn-form-group kn-box kn-box--column">
          <section class="kn-form-group__section contract-detail-section" aria-labelledby="kn-contract-customer-title">
            <div class="kn-form-group__header">
              <h3 class="type-heading-h6 type-weight-semibold" id="kn-contract-customer-title">General Customer Information</h3>
            </div>
            <div class="kn-form-group__fields contract-detail-grid contract-detail-grid--3">
              ${displayField("Customer Name", dash(contract.customerName))}
              ${displayField("Customer Type", dash(contract.customerTypeLabel))}
              ${displayField("Country", dash(contract.countryLabel))}
              ${displayField("Address", dash(contract.address))}
              ${displayField("City", dash(contract.city))}
              ${displayField("State/Province", dash(contract.state))}
              ${displayField("Zip/Postal Code", dash(contract.zip))}
            </div>
          </section>

          <section class="kn-form-group__section contract-detail-section" aria-labelledby="kn-contract-primary-title">
            <div class="kn-form-group__header">
              <h3 class="type-heading-h6 type-weight-semibold" id="kn-contract-primary-title">Primary Contact</h3>
              <p class="type-body-sm kn-form-group__subtitle">This is the person that will receive welcome email to onboard.</p>
            </div>
            <div class="kn-form-group__fields">${contactFields(contract.primaryContact)}</div>
          </section>

          <section class="kn-form-group__section contract-detail-section" aria-labelledby="kn-contract-renewal-title">
            <div class="kn-form-group__header">
              <h3 class="type-heading-h6 type-weight-semibold" id="kn-contract-renewal-title">Contact for Contract Renewal</h3>
              <p class="type-body-sm kn-form-group__subtitle">Person that needs to be contacted in order to renew contract.</p>
            </div>
            <div class="kn-form-group__fields">${contactFields(contract.renewalContact)}</div>
          </section>

          <section class="kn-form-group__section contract-detail-section" aria-labelledby="kn-contract-finance-title">
            <div class="kn-form-group__header">
              <h3 class="type-heading-h6 type-weight-semibold" id="kn-contract-finance-title">Finance Contact Details</h3>
              <p class="type-body-sm kn-form-group__subtitle">Person that needs to be contacted for finance.</p>
            </div>
            <div class="kn-form-group__fields">${contactFields(contract.financeContact)}</div>
          </section>

          <section class="kn-form-group__section contract-detail-section" aria-labelledby="kn-contract-recipients-title">
            <div class="kn-form-group__header">
              <h3 class="type-heading-h6 type-weight-semibold" id="kn-contract-recipients-title">Additional Invoice Recipients</h3>
              <p class="type-body-sm kn-form-group__subtitle">Added individual(s) will also receive a copy of the generated invoice directly in their email.</p>
            </div>
            <div class="kn-form-group__fields">${renderInvoiceRecipients(contract.invoiceRecipients)}</div>
          </section>

          <section class="kn-form-group__section contract-detail-section" aria-labelledby="kn-contract-payment-title">
            <div class="kn-form-group__header">
              <h3 class="type-heading-h6 type-weight-semibold" id="kn-contract-payment-title">Contract and Payment Details</h3>
            </div>
            <div class="kn-form-group__fields contract-detail-grid contract-detail-grid--3">
              ${displayField("Contract Term", dash(contract.contractTerm))}
              ${displayField("Contract Effective Date", dash(contract.effectiveDate))}
              ${displayField("Contract Expire Date", dash(contract.expirationDate))}
              ${displayField("Billing Term", dash(contract.billingTerm))}
              ${displayField("Product/Service", dash(contract.productsLabel))}
              ${displayField("Payment Term", dash(contract.paymentTermLabel))}
              ${displayField("Annual Commitment Currency", dash(contract.annualCommitmentCurrency))}
              ${displayField("Annual Commitment Amount", dash(contract.annualCommitmentAmount))}
              ${displayField("Remarks", dash(contract.remarks))}
            </div>
          </section>

          <section class="kn-form-group__section contract-detail-section" aria-labelledby="kn-contract-purchase-title">
            <div class="kn-form-group__header">
              <h3 class="type-heading-h6 type-weight-semibold" id="kn-contract-purchase-title">Purchase Details</h3>
            </div>
            <div class="kn-form-group__fields contract-detail-grid contract-detail-grid--3">
              ${displayField("First Invoice Amount", dash(contract.firstInvoiceAmount))}
              ${displayField("Credits Purchased", dash(contract.creditsPurchased))}
              ${displayField("Bonus Credits Offered", dash(contract.bonusCreditsOffered))}
            </div>
          </section>

          <section class="kn-form-group__section contract-detail-section" aria-labelledby="kn-contract-credits-title">
            <div class="kn-form-group__header">
              <h3 class="type-heading-h6 type-weight-semibold" id="kn-contract-credits-title">Credits for Each Transaction Type</h3>
            </div>
            <div class="kn-form-group__fields">${renderCreditsTable(contract.credits)}</div>
          </section>

          <section class="kn-form-group__section contract-detail-section contract-detail-section--last" aria-labelledby="kn-contract-docs-title">
            <div class="kn-form-group__header">
              <h3 class="type-heading-h6 type-weight-semibold" id="kn-contract-docs-title">Documents</h3>
            </div>
            <div class="kn-form-group__fields contract-detail-grid contract-detail-grid--2">
              ${documentField("PricingSheet", contract.documents?.pricingSheet)}
              ${documentField("MSA", contract.documents?.msa)}
              ${documentField("SOW", contract.documents?.sow)}
              ${documentField("Other", contract.documents?.other)}
            </div>
          </section>
        </div>
        <footer class="kn-drawer__footer">
          <div class="kn-drawer__footer-actions">
            <button class="btn btn--tertiary btn--md type-ui-md kn-btn" type="button" data-contract-close>Close</button>
          </div>
        </footer>
      </aside>
    </div>`;
  }

  function renderList() {
    const route = parseRoute();
    state.detailId = route.view === "detail" ? route.id : "";
    const rows = filteredContracts();
    const pages = Math.max(1, Math.ceil(rows.length / state.pageSize));
    if (state.page > pages) {
      state.page = pages;
    }
    const start = (state.page - 1) * state.pageSize;
    const pageRows = rows.slice(start, start + state.pageSize);
    const ux = window.KNAdminUX;
    const body = pageRows.length
      ? pageRows
          .map((row) => {
            const selected = row.id === state.detailId;
            return `<tr data-contract-id="${escapeHtml(row.id)}" tabindex="0" class="${selected ? "is-selected" : ""}">
          <td class="type-body-sm">
            <a class="kn-link type-body-sm type-weight-medium" href="#contract-management/${encodeURIComponent(row.id)}" data-contract-nav="detail" data-contract-id="${escapeHtml(row.id)}">${escapeHtml(row.contractId)}</a>
          </td>
          <td class="type-body-sm">${dash(row.customerId)}</td>
          <td class="type-body-sm">${dash(row.customerName)}</td>
          <td class="type-body-sm">${dash(row.countryLabel)}</td>
          <td class="type-body-sm">${dash(row.customerTypeLabel)}</td>
          <td class="type-body-sm">${dash(row.createdDate)}</td>
          <td class="type-body-sm">${dash(row.effectiveDate)}</td>
          <td class="type-body-sm">${dash(row.expirationDate)}</td>
          <td class="type-body-sm">${dash(row.lastModifiedBy)}</td>
          <td class="type-body-sm">${dash(row.lastModified)}</td>
        </tr>`;
          })
          .join("")
      : ux.tableEmptyRow({
          colspan: 10,
          title: hasListFilters() ? "No contracts match this view" : "No contracts yet",
          description: hasListFilters() ? "Clear filters to see every contract." : "Contracts will appear here once onboarded.",
          assetIcon: hasListFilters() ? "search" : "list",
          secondaryLabel: hasListFilters() ? "Clear filters" : "",
          secondaryAttr: "data-admin-clear-filters"
        });

    const contract = state.detailId ? findContract(state.detailId) : null;

    return `<header class="role-page__head">
      <div>
        <h1 class="type-heading-h3 type-weight-semibold">Contract Management</h1>
        <p class="type-body-sm">Customer contracts, billing terms, and service coverage.</p>
      </div>
    </header>
    <div class="contract-table-meta">
      <span class="type-caption-sm kn-field__hint">Filters Showing: ${rows.length} of ${loadContracts().length} Total Records</span>
      ${hasListFilters() ? `<button class="perm-clear-all type-caption-sm kn-link" type="button" data-admin-clear-filters>Reset Filters</button>` : ""}
    </div>
    <div class="vis-table-wrap role-table-card contract-table-card">
      <div class="vis-table-scroll">
        <table class="vis-table vis-table--admin contract-table" aria-label="Contracts">
          <thead>
            <tr class="vis-table__labels">
              ${sortHeader("contractId", "Contract ID")}
              ${sortHeader("customerId", "Customer Id")}
              ${sortHeader("customerName", "Customer Name")}
              ${sortHeader("countryLabel", "Country")}
              ${sortHeader("customerTypeLabel", "Customer Type")}
              ${sortHeader("createdDate", "Contract Created Date")}
              ${sortHeader("effectiveDate", "Contract Effective Date")}
              ${sortHeader("expirationDate", "Contract Expiration Date")}
              ${sortHeader("lastModifiedBy", "Last Modified By")}
              ${sortHeader("lastModified", "Last Modified")}
            </tr>
            <tr class="vis-table__filters">
              ${ux.colFilter({ attr: "data-contract-filter", key: "contractId", value: state.filters.contractId, label: "contract id", placeholder: "Search contract ID" })}
              ${ux.colFilter({ attr: "data-contract-filter", key: "customerId", value: state.filters.customerId, label: "customer id", placeholder: "Search customer ID" })}
              ${ux.colFilter({ attr: "data-contract-filter", key: "customerName", value: state.filters.customerName, label: "customer name", placeholder: "Search customer name" })}
              ${ux.colKnSelect({ attr: "data-contract-filter", key: "country", value: state.filters.country, label: "country", open: state.selectOpen, options: COUNTRY_OPTIONS.map((item) => ({ value: item.value, label: item.label })) })}
              ${ux.colKnSelect({ attr: "data-contract-filter", key: "customerType", value: state.filters.customerType, label: "customer type", open: state.selectOpen, options: TYPE_OPTIONS.map((item) => ({ value: item.value, label: item.label })) })}
              ${ux.colFilter({ attr: "data-contract-filter", key: "createdDate", value: state.filters.createdDate, label: "created date", placeholder: "Search created date" })}
              ${ux.colFilter({ attr: "data-contract-filter", key: "effectiveDate", value: state.filters.effectiveDate, label: "effective date", placeholder: "Search effective date" })}
              ${ux.colFilter({ attr: "data-contract-filter", key: "expirationDate", value: state.filters.expirationDate, label: "expiration date", placeholder: "Search expiration date" })}
              ${ux.colFilter({ attr: "data-contract-filter", key: "lastModifiedBy", value: state.filters.lastModifiedBy, label: "last modified by", placeholder: "Search last modified by" })}
              ${ux.colFilter({ attr: "data-contract-filter", key: "lastModified", value: state.filters.lastModified, label: "last modified", placeholder: "Search last modified" })}
            </tr>
          </thead>
          <tbody>${body}</tbody>
        </table>
      </div>
      ${ux.pagination({
        page: state.page,
        pages,
        total: rows.length,
        pageSize: state.pageSize,
        pageAttr: "data-contract-page",
        label: "Contract pages",
        sizeSelect: adminSelect({
          id: "kn-contract-pagesize",
          name: "pageSize",
          value: String(state.pageSize),
          options: [
            { id: "10", label: "10" },
            { id: "20", label: "20" },
            { id: "50", label: "50" }
          ],
          placeholder: "Rows",
          openKey: "pageSize",
          compact: true,
          includeEmpty: false
        })
      })}
    </div>
    ${contract ? renderDetailDrawer(contract) : route.view === "detail" ? `<div class="kn-drawer-root is-open" id="admin-contract-drawer"><div class="kn-drawer__overlay" data-contract-close tabindex="-1"></div><aside class="kn-drawer" role="alertdialog" aria-labelledby="kn-contract-missing-title"><header class="kn-drawer__header"><h2 class="type-heading-h5" id="kn-contract-missing-title">Contract unavailable</h2><button class="icon-btn" type="button" data-contract-close aria-label="Close">×</button></header><div class="kn-drawer__body"><p class="type-body-sm">That contract is no longer available.</p></div></aside></div>` : ""}`;
  }

  function render() {
    const root = document.getElementById("kn-contract-root");
    const page = document.getElementById("kn-contract-page");
    if (!root || !page || page.hidden) {
      return;
    }
    const scroller = document.querySelector(".content");
    const top = scroller?.scrollTop || 0;
    const drawerScroll = window.KNAdminUX.captureDrawerScroll(page);
    const drawerFocus = window.KNAdminUX.captureDrawerFocus(page);
    root.innerHTML = renderList();
    window.KNAdminUX.restoreDrawerScroll(page, drawerScroll);
    window.KNAdminUX.syncOverlayFocus(page, drawerFocus);
    if (scroller) {
      scroller.scrollTop = top;
    }
  }

  function bind(root) {
    root.addEventListener("click", (event) => {
      if (event.target.closest("[data-contract-close]")) {
        event.preventDefault();
        goto("#contract-management");
        return;
      }
      const nav = event.target.closest("[data-contract-nav]");
      if (nav) {
        event.preventDefault();
        const id = nav.getAttribute("data-contract-id") || "";
        goto(`#contract-management/${encodeURIComponent(id)}`);
        return;
      }
      const row = event.target.closest("tr[data-contract-id]");
      if (row && !event.target.closest("a,button,input,select,label")) {
        event.preventDefault();
        goto(`#contract-management/${encodeURIComponent(row.getAttribute("data-contract-id") || "")}`);
        return;
      }
      const sortBtn = event.target.closest("[data-contract-sort]");
      if (sortBtn) {
        event.preventDefault();
        const key = sortBtn.getAttribute("data-contract-sort") || "contractId";
        if (state.sortKey === key) {
          state.sortDir = state.sortDir === "asc" ? "desc" : "asc";
        } else {
          state.sortKey = key;
          state.sortDir = "asc";
        }
        render();
        return;
      }
      const pageBtn = event.target.closest("[data-contract-page]");
      if (pageBtn) {
        event.preventDefault();
        state.page = Number(pageBtn.getAttribute("data-contract-page")) || 1;
        render();
        return;
      }
      if (event.target.closest("[data-admin-clear-filters]")) {
        event.preventDefault();
        clearFilters();
        return;
      }
      const selectHandled = window.KNAdminUX.handleSelectClick(event, {
        open: state.selectOpen,
        setOpen: (next) => {
          state.selectOpen = next;
          render();
        },
        onChange: (key, value) => {
          if (key === "pageSize") {
            state.pageSize = Number(value) || 10;
            state.page = 1;
          } else if (Object.prototype.hasOwnProperty.call(state.filters, key)) {
            state.filters[key] = value;
            state.page = 1;
          }
          state.selectOpen = "";
          render();
        }
      });
      if (selectHandled) {
        return;
      }
    });

    root.addEventListener("input", (event) => {
      const field = event.target.closest("[data-contract-filter]");
      if (!field) {
        return;
      }
      const key = field.getAttribute("data-contract-filter");
      if (!key || !Object.prototype.hasOwnProperty.call(state.filters, key)) {
        return;
      }
      state.filters[key] = field.value;
      state.page = 1;
      render();
    });
  }

  function suspend() {
    state.detailId = "";
    state.selectOpen = "";
    document.getElementById("kn-contract-root")?.querySelectorAll(".kn-drawer-root").forEach((node) => node.remove());
  }

  function sync() {
    const page = document.getElementById("kn-contract-page");
    if (!page || page.hidden) {
      return;
    }
    render();
  }

  function init() {
    const page = document.getElementById("kn-contract-page");
    if (!page || page.dataset.bound) {
      return;
    }
    page.dataset.bound = "true";
    bind(page);
    document.addEventListener("kn-close-selects", () => {
      if (page.hidden || !state.selectOpen) {
        return;
      }
      state.selectOpen = "";
      render();
    });
    document.addEventListener("keydown", (event) => {
      if (page.hidden || event.key !== "Escape") {
        return;
      }
      if (window.KNAdminUX.handleOverlayKeydown(page, event)) {
        return;
      }
      if (parseRoute().view === "detail") {
        event.preventDefault();
        goto("#contract-management");
      } else if (state.selectOpen) {
        state.selectOpen = "";
        render();
      }
    });
  }

  window.KNContracts = {
    sync,
    init,
    suspend,
    parseRoute,
    list: loadContracts
  };
})();
