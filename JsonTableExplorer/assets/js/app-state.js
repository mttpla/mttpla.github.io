"use strict";

// STATE
const DEFAULT_FLATTEN_DEPTH = 3;
const DEFAULT_PAGE_SIZE = 20;
const DEFAULT_VISIBLE_COLUMN_LIMIT = 50;
const VALUE_FIELD = "value";

const state = {
    dataset: [],
    schema: [],
    columnRegistry: {},
    metadata: {},
    originalJson: null,
    table: null,
    rawDatasets: [],
    datasets: [],
    fileName: "",
    warnings: [],
    error: "",
    searchTerm: "",
    settings: {
        flattenDepth: DEFAULT_FLATTEN_DEPTH,
        pageSize: DEFAULT_PAGE_SIZE,
        visibleColumnLimit: DEFAULT_VISIBLE_COLUMN_LIMIT,
    },
    ui: {
        settingsOpen: false,
        settingsDirty: true,
        loading: false,
        summaryCollapsed: true,
        metadataCollapsed: false,
        jsonTreeCollapsed: true,
    },
};

const ui = {
    fileInput: document.getElementById("file-input"),
    fileName: document.getElementById("file-name"),
    globalSearch: document.getElementById("global-search"),
    settingsButton: document.getElementById("settings-button"),
    resetButton: document.getElementById("reset-button"),
    exportButton: document.getElementById("export-button"),
    messages: document.getElementById("messages"),
    summarySection: document.getElementById("summary-section"),
    summaryToggle: document.getElementById("summary-toggle"),
    summaryInline: document.getElementById("summary-inline"),
    summaryGrid: document.getElementById("summary-grid"),
    summaryIcon: document.getElementById("summary-icon"),
    metadataSection: document.getElementById("metadata-section"),
    metadataToggle: document.getElementById("metadata-toggle"),
    metadataInline: document.getElementById("metadata-inline"),
    metadataBody: document.getElementById("metadata-body"),
    metadataGrid: document.getElementById("metadata-grid"),
    metadataIcon: document.getElementById("metadata-icon"),
    jsonTreeSection: document.getElementById("json-tree-section"),
    jsonTreeToggle: document.getElementById("json-tree-toggle"),
    jsonTreeInline: document.getElementById("json-tree-inline"),
    jsonTreeBody: document.getElementById("json-tree-body"),
    jsonTreeContent: document.getElementById("json-tree-content"),
    jsonTreeIcon: document.getElementById("json-tree-icon"),
    datasetsContainer:
        document.getElementById("datasets-container"),
    emptyState: document.getElementById("empty-state"),
    copyrightLabel: document.getElementById("copyright-label"),
    drawerBackdrop: document.getElementById("drawer-backdrop"),
    settingsDrawer: document.getElementById("settings-drawer"),
    closeSettingsButton: document.getElementById(
        "close-settings-button",
    ),
    flattenDepthInput: document.getElementById(
        "flatten-depth-input",
    ),
    applyDepthButton: document.getElementById("apply-depth-button"),
    pageSizeSelect: document.getElementById("page-size-select"),
    applyPageSizeButton: document.getElementById(
        "apply-page-size-button",
    ),
    visibleColumnLimitInput: document.getElementById(
        "visible-column-limit-input",
    ),
    applyVisibleColumnLimitButton: document.getElementById(
        "apply-visible-column-limit-button",
    ),
    settingsDatasets: document.getElementById("settings-datasets"),
    loadingOverlay: document.getElementById("loading-overlay"),
    loadingTitle: document.getElementById("loading-title"),
    loadingDetail: document.getElementById("loading-detail"),
};
