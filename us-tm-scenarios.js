/**
 * US Transaction Manager — shared import scenarios for demo / Klear Agent context.
 * Single source of truth for cross-table joins (MBL, HBL, shipment IDs, entry numbers).
 * Loaded before transaction-us-*.js modules; exposed as window.KNUsTmScenarios.
 */
(() => {
  const IMPORT_US = "US - United States of America";

  /** @type {Array<object>} */
  const SCENARIOS = [
    {
      id: "scenario-alpha",
      assistSummary: "GLOBAL-PAK ocean import from Antwerp (Belgium) to Los Angeles. ISF accepted, in-bond filed, entry in progress, PSC sent for HTS correction.",
      isf: {
        id: "isf-1",
        transactionId: "ISF-021D-8",
        companyName: "GLOBAL-PAK",
        cbpNumber: "ISF-18354115",
        username: "KAMAL SINGH",
        status: "ACCEPTED",
        statusChip: "submitted",
        etd: "Feb 11, 2025",
        vesselName: "APL LE HAVRE",
        vesselId: "9350381",
        filingDate: "May 18, 2025",
        shipments: "KR-OB0T-283",
        mbl: "CMDUHB0204786",
        hbl: "EGET20427328",
        country: "BE - Belgium",
        mot: "OCEAN"
      },
      inBond: {
        id: "inb-2",
        transactionId: "INB-021D-8",
        entryNumber: "Undefined-00000002",
        transactionState: "READY",
        statusChip: "submitted",
        eta: "Feb 11, 2025",
        shipments: "KN-OB0T-283",
        filingDate: "May 18, 2025",
        mot: "OCEAN"
      },
      entry: {
        id: "entry-4",
        transactionId: "KN-0178-1",
        entryNumber: "217-01302401",
        entryType: "01 - CONSUMPTION",
        entrySummary: "ACCEPTED",
        cargoRelease: "ACCEPTED",
        firmsCode: "AA19",
        portUnlading: "2704 - LOS ANGELES, CA, US",
        statusChip: "active"
      },
      psc: {
        id: "psc-3",
        transactionId: "KN-0177-60",
        pscTransactionIds: ["KN-0127-60-1"],
        pscType: "PSC",
        pscStatus: "SENT",
        filingDate: ""
      },
      ftz: {
        id: "ftz-1",
        transactionId: "FTZ-FTZ1-100",
        zoneId: "FTZ-25B",
        admissionNumber: "ADM-840000",
        ftzStatus: "ACTIVE",
        statusChip: "active",
        shipments: "KX-FTZ1-283"
      },
      deliveryOrder: {
        id: "do-1",
        transactionId: "KN-07BI-201",
        entryNumber: "BII-15043201",
        carrier: "CMA CGM AMERICA, LLC",
        mot: "OCEAN"
      }
    },
    {
      id: "scenario-beta",
      assistSummary: "ILLUMINATE USA LLC electronics from Ho Chi Minh City (Vietnam). ISF sent, in-bond new at port, entry filing active.",
      isf: {
        id: "isf-2",
        transactionId: "ISF-021D-9",
        companyName: "ILLUMINATE USA LLC",
        cbpNumber: "ISF-18354132",
        username: "MARIA LOPEZ",
        status: "SENT",
        statusChip: "submitted",
        etd: "Feb 17, 2025",
        vesselName: "WAN HAI 512",
        vesselId: "9457822",
        filingDate: "May 24, 2025",
        shipments: "VN-OB1K-441",
        mbl: "ONEYSGNFL9591500",
        hbl: "MCLMVSSAV2507004",
        country: "VN - Vietnam",
        mot: "OCEAN"
      },
      inBond: {
        id: "inb-1",
        transactionId: "INB-M001-1",
        entryNumber: "Undefined-00000001",
        transactionState: "NEW",
        statusChip: "pending",
        eta: "Nov 22, 2024",
        shipments: "KN-OB1K-441",
        filingDate: "",
        mot: "OCEAN"
      },
      entry: {
        id: "entry-5",
        transactionId: "KN-0178-2",
        entryNumber: "217-01302402",
        entryType: "01 - CONSUMPTION",
        entrySummary: "IN PROGRESS",
        cargoRelease: "IN PROGRESS",
        firmsCode: "V136",
        portUnlading: "5301 - HOUSTON, TX, US",
        statusChip: "active"
      },
      psc: {
        id: "psc-4",
        transactionId: "KN-0178-12",
        pscTransactionIds: ["KN-0178-12-1"],
        pscType: "PSC",
        pscStatus: "IN PROCESS",
        filingDate: "May 24, 2025"
      },
      ftz: null,
      deliveryOrder: {
        id: "do-2",
        transactionId: "KN-07BI-117",
        entryNumber: "BII-15043235",
        carrier: "DHL AIR LIMITED, DO",
        mot: "AIR"
      }
    },
    {
      id: "scenario-gamma",
      assistSummary: "BASF agricultural chemicals from Shanghai pending ISF. In-bond and entry not yet filed.",
      isf: {
        id: "isf-3",
        transactionId: "ISF-021D-5",
        companyName: "BASF AGRICULTURAL SOLUTIONS INC LLC",
        cbpNumber: "",
        username: "PRIYA SHARMA",
        status: "NEW",
        statusChip: "pending",
        etd: "May 03, 2025",
        vesselName: "EVER LISSOME",
        vesselId: "9593878",
        filingDate: "",
        shipments: "CN-OB3M-118",
        mbl: "EGLV1975001234",
        hbl: "SHAA240518047",
        country: "CN - China",
        mot: "OCEAN"
      },
      inBond: {
        id: "inb-3",
        transactionId: "INB-021D-5",
        entryNumber: "Undefined-00000003",
        transactionState: "NEW",
        statusChip: "pending",
        eta: "May 03, 2025",
        shipments: "KN-OB3M-118",
        filingDate: "",
        mot: "OCEAN"
      },
      entry: {
        id: "entry-6",
        transactionId: "KN-0180-3",
        entryNumber: "217-01302403",
        entryType: "01 - CONSUMPTION",
        entrySummary: "IN PROGRESS",
        cargoRelease: "IN PROGRESS",
        firmsCode: "A007",
        portUnlading: "1001 - NEW YORK, NY, US",
        statusChip: "recent"
      },
      psc: {
        id: "psc-5",
        transactionId: "KN-0180-8",
        pscTransactionIds: ["KN-0180-8-1"],
        pscType: "PSC",
        pscStatus: "ACCEPTED",
        filingDate: "May 03, 2025"
      },
      ftz: {
        id: "ftz-2",
        transactionId: "FTZ-084A-102",
        zoneId: "FTZ-84A",
        admissionNumber: "ADM-840017",
        ftzStatus: "PENDING ADMISSION",
        statusChip: "pending",
        shipments: "KX-084A-118"
      },
      deliveryOrder: null
    },
    {
      id: "scenario-delta",
      assistSummary: "PACIFIC RIM TRADING consumer goods from Kaohsiung (Taiwan). ISF new, awaiting vessel departure.",
      isf: {
        id: "isf-4",
        transactionId: "ISF-021D-4",
        companyName: "PACIFIC RIM TRADING CO",
        cbpNumber: "",
        username: "JAMES CHEN",
        status: "NEW",
        statusChip: "pending",
        etd: "May 04, 2025",
        vesselName: "MSC OSCAR",
        vesselId: "9703318",
        filingDate: "",
        shipments: "TW-OB2F-512",
        mbl: "MEDUHB0284764",
        hbl: "TPEB240512901",
        country: "TW - Taiwan",
        mot: "OCEAN"
      },
      inBond: {
        id: "inb-4",
        transactionId: "INB-021D-4",
        entryNumber: "Undefined-00000004",
        transactionState: "NEW",
        statusChip: "pending",
        eta: "May 04, 2025",
        shipments: "KN-OB2F-512",
        filingDate: "",
        mot: "OCEAN"
      },
      entry: {
        id: "entry-7",
        transactionId: "KN-0180-4",
        entryNumber: "217-01302404",
        entryType: "01 - CONSUMPTION",
        entrySummary: "IN PROGRESS",
        cargoRelease: "IN PROGRESS",
        firmsCode: "X362",
        portUnlading: "2704 - LOS ANGELES, CA, US",
        statusChip: "recent"
      },
      psc: {
        id: "psc-6",
        transactionId: "KN-0180-15",
        pscTransactionIds: ["KN-0180-15-1"],
        pscType: "PSC",
        pscStatus: "SENT",
        filingDate: ""
      },
      ftz: null,
      deliveryOrder: null
    },
    {
      id: "scenario-epsilon",
      assistSummary: "NORTHSTAR LOGISTICS air freight from Bangalore (India). Expedited MOT with in-bond in process.",
      isf: {
        id: "isf-5",
        transactionId: "ISF-021D-6",
        companyName: "NORTHSTAR LOGISTICS INC",
        cbpNumber: "",
        username: "ANITA DESAI",
        status: "IN PROCESS",
        statusChip: "pending",
        etd: "May 04, 2025",
        vesselName: "MAERSK ESSEX",
        vesselId: "9632153",
        filingDate: "",
        shipments: "IN-OB7R-902",
        mbl: "MAEU9876543210",
        hbl: "BLR2405041182",
        country: "IN - India",
        mot: "AIR"
      },
      inBond: {
        id: "inb-5",
        transactionId: "INB-021D-6",
        entryNumber: "Undefined-00000005",
        transactionState: "IN PROCESS",
        statusChip: "pending",
        eta: "May 04, 2025",
        shipments: "KN-OB7R-902",
        filingDate: "",
        mot: "AIR"
      },
      entry: {
        id: "entry-8",
        transactionId: "KN-0181-5",
        entryNumber: "217-01302405",
        entryType: "01 - CONSUMPTION",
        entrySummary: "IN PROGRESS",
        cargoRelease: "IN PROGRESS",
        firmsCode: "H054",
        portUnlading: "2811",
        statusChip: "recent",
        mot: "AIR"
      },
      psc: null,
      ftz: null,
      deliveryOrder: null
    },
    {
      id: "scenario-zeta",
      assistSummary: "SUMMIT IMPORT GROUP textiles from Singapore. ISF filed, entry accepted at port.",
      isf: {
        id: "isf-6",
        transactionId: "ISF-021D-7",
        companyName: "SUMMIT IMPORT GROUP LLC",
        cbpNumber: "",
        username: "DAVID PARK",
        status: "NEW",
        statusChip: "pending",
        etd: "May 08, 2025",
        vesselName: "ONE HAMBURG",
        vesselId: "9741425",
        filingDate: "May 18, 2025",
        shipments: "SG-OB4N-331",
        mbl: "HLCUHB4782301",
        hbl: "SGN2405087720",
        country: "SG - Singapore",
        mot: "OCEAN"
      },
      inBond: {
        id: "inb-6",
        transactionId: "INB-021D-7",
        entryNumber: "Undefined-00000006",
        transactionState: "NEW",
        statusChip: "pending",
        eta: "May 08, 2025",
        shipments: "KN-OB4N-331",
        filingDate: "May 18, 2025",
        mot: "OCEAN"
      },
      entry: {
        id: "entry-9",
        transactionId: "KN-0181-6",
        entryNumber: "217-01302406",
        entryType: "01 - CONSUMPTION",
        entrySummary: "ACCEPTED",
        cargoRelease: "ACCEPTED",
        firmsCode: "ACCT",
        portUnlading: "0101; 55, CA, CA",
        statusChip: "active"
      },
      psc: null,
      ftz: null,
      deliveryOrder: null
    },
    {
      id: "scenario-eta",
      assistSummary: "ATLANTIC CARGO PARTNERS machinery from Jebel Ali (UAE). In-bond ready for movement to inland port.",
      isf: {
        id: "isf-7",
        transactionId: "ISF-023F-1",
        companyName: "ATLANTIC CARGO PARTNERS",
        cbpNumber: "",
        username: "SOPHIE MARTIN",
        status: "IN PROCESS",
        statusChip: "pending",
        etd: "May 18, 2025",
        vesselName: "COSCO SHIPPING UNIVERSE",
        vesselId: "9795600",
        filingDate: "",
        shipments: "AE-OB9K-118",
        mbl: "CMDUAE7654321",
        hbl: "DXB2405180094",
        country: "AE - United Arab Emirates",
        mot: "OCEAN"
      },
      inBond: {
        id: "inb-7",
        transactionId: "INB-023F-1",
        entryNumber: "Undefined-00000007",
        transactionState: "IN PROCESS",
        statusChip: "pending",
        eta: "May 18, 2025",
        shipments: "KN-OB9K-118",
        filingDate: "",
        mot: "OCEAN"
      },
      entry: {
        id: "entry-10",
        transactionId: "KN-0177-80",
        entryNumber: "217-01302407",
        entryType: "01 - CONSUMPTION",
        entrySummary: "IN PROGRESS",
        cargoRelease: "IN PROGRESS",
        firmsCode: "AN9",
        portUnlading: "1704",
        statusChip: "recent"
      },
      psc: null,
      ftz: null,
      deliveryOrder: null
    },
    {
      id: "scenario-warehouse",
      assistSummary: "US COMPANY 3 domestic warehouse entry (type 21). No ocean bill — truck movement only.",
      isf: null,
      inBond: null,
      entry: {
        id: "entry-1",
        transactionId: "KN-0177-216",
        companyName: "US COMPANY 3",
        entryNumber: "217-01302376",
        entryType: "21 - WAREHOUSE",
        username: "US THIRD PARTY",
        entrySummary: "IN PROGRESS",
        cargoRelease: "IN PROGRESS",
        firmsCode: "AN9",
        eta: "Sep 21, 2025",
        fspdDate: "Sep 28, 2025",
        vesselName: "WAN HAI 512,S497022",
        shipments: "NA",
        mot: "TRUCK",
        mbl: "",
        hbl: "",
        countryExport: IMPORT_US,
        countryImport: IMPORT_US,
        portUnlading: "1704",
        statusChip: "recent"
      },
      psc: null,
      ftz: {
        id: "ftz-3",
        transactionId: "FTZ-122-88",
        zoneId: "FTZ-122",
        admissionNumber: "ADM-840122",
        ftzStatus: "ADMITTED",
        statusChip: "admitted",
        shipments: "KX-122-216"
      },
      deliveryOrder: null
    },
    {
      id: "scenario-consumption",
      assistSummary: "US COMPANY 1 consumption entry from Georgia with accepted PSC on file.",
      isf: null,
      inBond: null,
      entry: {
        id: "entry-2",
        transactionId: "KN-0177-6",
        companyName: "US COMPANY 1",
        entryNumber: "217-01308333",
        entryType: "01 - CONSUMPTION",
        username: "US THIRD PARTY",
        entrySummary: "IN PROGRESS",
        cargoRelease: "IN PROGRESS",
        firmsCode: "A007",
        eta: "Oct 14, 2025",
        fspdDate: "Feb 04, 2025",
        vesselName: "EVER ELITE,9783510",
        filingDate: "Sep 11, 2025",
        shipments: "KR-0177-18",
        mot: "OCEAN",
        mbl: "33000628620",
        hbl: "8650121248",
        countryExport: "GE - Georgia",
        countryImport: IMPORT_US,
        portUnlading: "2811",
        statusChip: "active"
      },
      psc: {
        id: "psc-2",
        transactionId: "KN-0177-52",
        pscTransactionIds: ["KN-0127-53-1"],
        pscType: "PSC",
        pscStatus: "ACCEPTED",
        filingDate: "Aug 21, 2023",
        shipments: "KN-0177-54"
      },
      ftz: null,
      deliveryOrder: {
        id: "do-3",
        transactionId: "KN-07HA-88",
        entryNumber: "BII-15043300",
        carrier: "FEDEX, FX",
        mot: "AIR"
      }
    },
    {
      id: "scenario-adcvd",
      assistSummary: "US COMPANY 3 antidumping/countervailing entry from Germany. No cargo release yet.",
      isf: null,
      inBond: null,
      entry: {
        id: "entry-3",
        transactionId: "KN-0179-80",
        companyName: "US COMPANY 3",
        entryNumber: "217-01308862",
        entryType: "07 - CONSUMPTION: ANTIDUMPING/COUNTERVAILING DUTY AND QUOTA/VISA COMBINATION",
        username: "US THIRD PARTY",
        entrySummary: "NONE",
        cargoRelease: "NONE",
        firmsCode: "ACCT",
        eta: "Oct 14, 2025",
        shipments: "KR-0177-65",
        mot: "OCEAN",
        mbl: "RJJA8087000",
        hbl: "ITGNJK",
        countryExport: "DE - Germany",
        countryImport: IMPORT_US,
        portUnlading: "0101; 55, CA, CA",
        statusChip: "recent"
      },
      psc: null,
      ftz: null,
      deliveryOrder: null
    }
  ];

  const COMPANIES = [
    "GLOBAL-PAK",
    "ILLUMINATE USA LLC",
    "BASF AGRICULTURAL SOLUTIONS INC LLC",
    "PACIFIC RIM TRADING CO",
    "NORTHSTAR LOGISTICS INC",
    "SUMMIT IMPORT GROUP LLC",
    "ATLANTIC CARGO PARTNERS",
    "HURST JAWS OF LIFE INC - SMALL",
    "JOBY AERO, INC",
    "SAFRAN CABIN INC. - GARDEN GROVE",
    "ACUITY BRANDS",
    "CAMERON INTERNATIONAL CORPORATION (SUB QC)",
    "ICHOR SYSTEMS INC",
    "SAFRAN CABIN CANADA CO"
  ];

  const USERS = ["KAMAL SINGH", "RAJA KUMAR", "PRIYA SHARMA", "ANITA DESAI", "JAMES CHEN", "MARIA LOPEZ", "DAVID PARK", "SOPHIE MARTIN", "US THIRD PARTY", ""];

  const MBL_PREFIXES = ["CMDU", "MAEU", "ONEY", "EGLV", "HLCU", "MEDU", "HDMU", "COSU", "YMLU"];
  const HBL_PREFIXES = ["EGET", "MCLM", "SHAA", "TPEB", "BLR", "SGN", "DXB", "BKK", "HHKA"];

  function pad(n, width) {
    return String(n).padStart(width, "0");
  }

  function parseSortDate(value) {
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  function knShipmentFromIsf(shipments) {
    const ship = String(shipments || "");
    const match = ship.match(/^[A-Z]{2}-OB([A-Z0-9]+)-(\d+)$/);
    if (match) return `KN-${match[1]}-${match[2]}`;
    return ship;
  }

  function scenarioAt(i) {
    return SCENARIOS[i % SCENARIOS.length];
  }

  function getScenarioById(id) {
    return SCENARIOS.find((s) => s.id === id) || null;
  }

  function getScenarioByMbl(mbl) {
    if (!mbl) return null;
    return SCENARIOS.find((s) => s.isf?.mbl === mbl || s.entry?.mbl === mbl) || null;
  }

  function getScenarioByIsfId(isfId) {
    return SCENARIOS.find((s) => s.isf?.id === isfId) || null;
  }

  function isfCuratedRows() {
    return SCENARIOS.filter((s) => s.isf).map((s) => {
      const isf = s.isf;
      return {
        id: isf.id,
        transactionId: isf.transactionId,
        companyName: isf.companyName,
        cbpNumber: isf.cbpNumber || "",
        username: isf.username,
        status: isf.status,
        statusChip: isf.statusChip,
        etd: isf.etd,
        etdSort: parseSortDate(isf.etd),
        vesselName: isf.vesselName,
        vesselId: isf.vesselId,
        filingDate: isf.filingDate || "",
        filingSort: isf.filingDate ? parseSortDate(isf.filingDate) : 0,
        shipments: isf.shipments,
        mbl: isf.mbl,
        hbl: isf.hbl,
        country: isf.country,
        mot: isf.mot || "OCEAN",
        scenarioId: s.id,
        assistSummary: s.assistSummary
      };
    });
  }

  function isfFallbackRows() {
    return isfCuratedRows().map((row) => ({
      id: row.id,
      transactionId: row.transactionId,
      companyName: row.companyName,
      username: row.username,
      status: row.status,
      statusChip: row.statusChip,
      etd: row.etd,
      etdSort: row.etdSort,
      filingDate: row.filingDate,
      filingSort: row.filingSort,
      shipments: row.shipments,
      mbl: row.mbl,
      hbl: row.hbl,
      country: row.country
    }));
  }

  function inbFallbackRows() {
    return SCENARIOS.filter((s) => s.inBond).map((s) => ({
      id: s.inBond.id,
      transactionId: s.inBond.transactionId,
      mbl: s.isf?.mbl || "",
      isfLinkId: s.isf?.id || "",
      isfTransactionId: s.isf?.transactionId || ""
    }));
  }

  function entryFallbackRows() {
    return SCENARIOS.filter((s) => s.entry).map((s) => {
      const e = s.entry;
      const isf = s.isf;
      const inb = s.inBond;
      return {
        id: e.id,
        transactionId: e.transactionId,
        entryNumber: e.entryNumber,
        companyName: e.companyName || isf?.companyName || "",
        shipments: e.shipments || isf?.shipments || "NA",
        mbl: e.mbl ?? isf?.mbl ?? "",
        hbl: e.hbl ?? isf?.hbl ?? "",
        entrySummary: e.entrySummary || "IN PROGRESS",
        filingDate: e.filingDate || isf?.filingDate || "",
        isfLinkId: isf?.id || "",
        isfTransactionId: isf?.transactionId || "",
        inbLinkId: inb?.id || "",
        inbTransactionId: inb?.transactionId || ""
      };
    });
  }

  /** Deterministic MBL/HBL for generated rows — cycles through scenario keys when available. */
  function generatedBillKeys(i) {
    const linked = SCENARIOS.filter((s) => s.isf);
    if (linked.length && i < linked.length * 30) {
      const s = linked[i % linked.length];
      const suffix = pad((i * 7919) % 1000, 3);
      return {
        companyName: s.isf.companyName,
        mbl: s.isf.mbl,
        hbl: s.isf.hbl,
        shipments: s.isf.shipments,
        country: s.isf.country,
        username: s.isf.username,
        scenarioId: s.id
      };
    }
    const prefix = MBL_PREFIXES[i % MBL_PREFIXES.length];
    const hblPrefix = HBL_PREFIXES[i % HBL_PREFIXES.length];
    return {
      companyName: COMPANIES[i % COMPANIES.length],
      mbl: `${prefix}${pad((i * 7919) % 1e10, 10)}`,
      hbl: `${hblPrefix}${pad((i * 6287) % 1e8, 8)}`,
      shipments: `${["KR", "VN", "CN", "TW", "IN"][i % 5]}-OB${pad(i % 36, 2)}-${100 + (i % 900)}`,
      country: `${["BE", "VN", "CN", "TW", "IN"][i % 5]} - Country`,
      username: USERS[i % USERS.length],
      scenarioId: ""
    };
  }

  /** Klear Agent — resolve record context by module + row id. */
  function assistContext(module, rowId) {
    const mod = String(module || "").toLowerCase();
    for (const s of SCENARIOS) {
      const bucket = s[mod] || s[mod.replace(/-/g, "")];
      if (bucket?.id === rowId) {
        return {
          scenarioId: s.id,
          summary: s.assistSummary,
          module,
          rowId,
          chain: {
            isf: s.isf?.transactionId || null,
            inBond: s.inBond?.transactionId || null,
            entry: s.entry?.entryNumber || null,
            psc: s.psc?.transactionId || null,
            mbl: s.isf?.mbl || s.entry?.mbl || null
          }
        };
      }
      if (mod === "isf" && s.isf?.id === rowId) return assistContext("isf", rowId);
      if (mod === "inbond" && s.inBond?.id === rowId) return { scenarioId: s.id, summary: s.assistSummary, module, rowId, chain: { isf: s.isf?.transactionId, inBond: s.inBond?.transactionId, entry: s.entry?.entryNumber, mbl: s.isf?.mbl } };
      if (mod === "entry" && s.entry?.id === rowId) return { scenarioId: s.id, summary: s.assistSummary, module, rowId, chain: { isf: s.isf?.transactionId, inBond: s.inBond?.transactionId, entry: s.entry?.entryNumber, mbl: s.entry?.mbl || s.isf?.mbl } };
      if (mod === "psc" && s.psc?.id === rowId) return { scenarioId: s.id, summary: s.assistSummary, module, rowId, chain: { entry: s.entry?.entryNumber, psc: s.psc?.transactionId, mbl: s.entry?.mbl || s.isf?.mbl } };
    }
    return null;
  }

  window.KNUsTmScenarios = {
    SCENARIOS,
    COMPANIES,
    USERS,
    MBL_PREFIXES,
    HBL_PREFIXES,
    IMPORT_US,
    pad,
    parseSortDate,
    knShipmentFromIsf,
    scenarioAt,
    getScenarioById,
    getScenarioByMbl,
    getScenarioByIsfId,
    isfCuratedRows,
    isfFallbackRows,
    inbFallbackRows,
    entryFallbackRows,
    generatedBillKeys,
    assistContext
  };
})();
