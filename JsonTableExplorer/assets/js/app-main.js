"use strict";

// BOOTSTRAP AND EVENT HANDLERS

initializeApp();

function initializeApp() {
    bindEvents();
    renderSelectedFileName();
    renderMessages();
    renderSummarySection();
    renderMetadataSection();
    renderJsonTreeSection();
    renderSettingsDrawer();
    renderDatasets();
    renderLoadingState();
    renderFooterMetadata();
    updateControlState();
}
function bindEvents() {
    ui.fileInput.addEventListener("change", handleFileSelection);
    ui.emptyUploadCard.addEventListener("click", function () {
        ui.fileInput.click();
    });
    ui.emptyPasteCard.addEventListener("click", openPastePanel);
    ui.topbarPasteButton.addEventListener("click", openPastePanel);
    ui.pasteLoadButton.addEventListener("click", handlePasteInput);
    ui.pasteCancelButton.addEventListener("click", closePastePanel);
    ui.globalSearch.addEventListener("input", handleGlobalSearch);
    ui.settingsButton.addEventListener(
        "click",
        toggleSettingsDrawer,
    );
    ui.closeSettingsButton.addEventListener(
        "click",
        closeSettingsDrawer,
    );
    ui.drawerBackdrop.addEventListener(
        "click",
        closeSettingsDrawer,
    );
    ui.resetButton.addEventListener(
        "click",
        handleResetConfiguration,
    );
    ui.exportButton.addEventListener("click", handleExportCsv);
    ui.downloadJsonButton.addEventListener(
        "click",
        handleDownloadJson,
    );
    ui.summaryToggle.addEventListener(
        "click",
        toggleSummarySection,
    );
    ui.metadataToggle.addEventListener(
        "click",
        toggleMetadataSection,
    );
    ui.jsonTreeToggle.addEventListener(
        "click",
        toggleJsonTreeSection,
    );
    ui.applyDepthButton.addEventListener(
        "click",
        handleApplyFlattenDepth,
    );
    ui.applyPageSizeButton.addEventListener(
        "click",
        handleApplyPageSize,
    );
    ui.applyVisibleColumnLimitButton.addEventListener(
        "click",
        handleApplyVisibleColumnLimit,
    );
    ui.settingsDatasets.addEventListener(
        "change",
        handleSettingsChange,
    );
    document.addEventListener("keydown", handleKeydown);
}
function handleSettingsChange(event) {
    var target = event.target;
    var datasetId = target.getAttribute("data-dataset-id");
    var field = target.getAttribute("data-field");
    var action = target.getAttribute("data-action");
    var datasetState = getDatasetById(datasetId);

    if (
        !datasetState ||
        !field ||
        !datasetState.columnRegistry[field]
    ) {
        return;
    }

    if (action === "visible") {
        var nextVisible = Boolean(target.checked);
        runBlockingTask(
            "Updating columns",
            "Applying the new column visibility to the dataset.",
            function () {
                datasetState.columnRegistry[field].visible =
                    nextVisible;
                createOrRefreshTable(datasetState, false);
                syncPrimaryState();
            },
        );
        return;
    }

    if (action === "aggregation") {
        var nextAggregation = target.value;
        runBlockingTask(
            "Updating aggregations",
            "Refreshing table calculations for the selected column.",
            function () {
                datasetState.columnRegistry[field].aggregation =
                    nextAggregation;
                createOrRefreshTable(datasetState, false);
                syncPrimaryState();
            },
        );
    }
}
function handleGlobalSearch(event) {
    state.searchTerm = event.target.value || "";
    applyGlobalSearchFilter();
}
function handleApplyFlattenDepth() {
    var rawValue = Number(ui.flattenDepthInput.value);
    if (!Number.isFinite(rawValue)) {
        ui.flattenDepthInput.value = String(
            state.settings.flattenDepth,
        );
        return;
    }

    var nextDepth = clamp(Math.round(rawValue), 1, 8);
    ui.flattenDepthInput.value = String(nextDepth);

    if (!state.rawDatasets.length) {
        state.settings.flattenDepth = nextDepth;
        renderSummarySection();
        return;
    }

    if (state.settings.flattenDepth === nextDepth) {
        return;
    }

    state.settings.flattenDepth = nextDepth;
    runBlockingTask(
        "Rebuilding schema",
        "Applying the new flatten depth to all datasets.",
        function () {
            rebuildDatasetsFromRaw();
        },
    );
}
function handleApplyPageSize() {
    var nextSize = Number(ui.pageSizeSelect.value);

    if (!Number.isFinite(nextSize) || nextSize <= 0) {
        ui.pageSizeSelect.value = String(state.settings.pageSize);
        return;
    }

    nextSize = Math.round(nextSize);

    if (state.settings.pageSize === nextSize) {
        return;
    }

    state.settings.pageSize = nextSize;

    if (!state.datasets.length) {
        renderSummarySection();
        return;
    }

    runBlockingTask(
        "Updating pagination",
        "Applying the new page size to all rendered tables.",
        function () {
            state.datasets.forEach(function (datasetState) {
                if (datasetState.table) {
                    datasetState.table.setPageSize(nextSize);
                    datasetState.table.setPage(1);
                    datasetState.table.setHeight(
                        computeDatasetTableMaxHeight(datasetState) +
                            "px",
                    );
                    datasetState.table.redraw(true);
                }
            });
            renderSummarySection();
        },
    );
}
function handleApplyVisibleColumnLimit() {
    var rawValue = Number(ui.visibleColumnLimitInput.value);
    if (!Number.isFinite(rawValue)) {
        ui.visibleColumnLimitInput.value = String(
            state.settings.visibleColumnLimit,
        );
        return;
    }

    var nextLimit = Math.max(Math.round(rawValue), 1);
    ui.visibleColumnLimitInput.value = String(nextLimit);

    if (state.settings.visibleColumnLimit === nextLimit) {
        return;
    }

    state.settings.visibleColumnLimit = nextLimit;

    if (!state.datasets.length) {
        renderSummarySection();
        return;
    }

    runBlockingTask(
        "Updating visible columns",
        "Applying the default visible-column limit to all datasets.",
        function () {
            state.datasets.forEach(function (datasetState) {
                applyVisibleColumnLimitToDataset(
                    datasetState,
                    nextLimit,
                );
                createOrRefreshTable(datasetState, false);
            });
            state.warnings = collectWarnings(state.datasets);
            state.ui.settingsDirty = true;
            syncPrimaryState();
            renderMessages();
            renderSummarySection();
            renderSettingsDrawer();
            updateControlState();
        },
    );
}
function handleResetConfiguration() {
    if (!state.rawDatasets.length) {
        return;
    }

    state.searchTerm = "";
    state.settings.flattenDepth = DEFAULT_FLATTEN_DEPTH;
    state.settings.pageSize = DEFAULT_PAGE_SIZE;
    state.settings.visibleColumnLimit =
        DEFAULT_VISIBLE_COLUMN_LIMIT;
    state.ui.summaryCollapsed = true;
    state.ui.metadataCollapsed = false;
    ui.globalSearch.value = "";
    ui.flattenDepthInput.value = String(DEFAULT_FLATTEN_DEPTH);
    ui.pageSizeSelect.value = String(DEFAULT_PAGE_SIZE);
    ui.visibleColumnLimitInput.value = String(
        DEFAULT_VISIBLE_COLUMN_LIMIT,
    );
    runBlockingTask(
        "Resetting configuration",
        "Restoring default schema and table settings.",
        function () {
            rebuildDatasetsFromRaw();
        },
    );
}
function handleExportCsv() {
    var exportable = state.datasets.filter(function (datasetState) {
        return Boolean(datasetState.table);
    });

    if (!exportable.length) {
        return;
    }

    var baseName = buildExportBaseName(state.fileName || "data");

    exportable.forEach(function (datasetState, index) {
        // Stagger downloads so the browser does not merge them into one
        window.setTimeout(function () {
            if (datasetState.table) {
                datasetState.table.download(
                    "csv",
                    baseName +
                        "-" +
                        sanitizeFilePart(datasetState.name) +
                        ".csv",
                );
            }
        }, index * 140);
    });
}

function handleDownloadJson() {
    if (!state.originalJson || !state.datasets.length) {
        return;
    }

    var snapshot = buildJteSnapshot();
    var output;

    if (Array.isArray(state.originalJson)) {
        // Wrap array root: colleague loads file and gets original array back via $data
        output = {};
        output[JTE_KEY] = snapshot[JTE_KEY];
        output["$data"] = state.originalJson;
    } else {
        // Merge JTE key into existing root object
        output = {};
        Object.keys(state.originalJson).forEach(function (key) {
            output[key] = state.originalJson[key];
        });
        output[JTE_KEY] = snapshot[JTE_KEY];
    }

    var baseName = buildExportBaseName(state.fileName || "data");
    var jsonString = JSON.stringify(output, null, 2);
    var blob = new Blob([jsonString], { type: "application/json" });
    var url = URL.createObjectURL(blob);
    var anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = baseName + ".jtx.json";
    document.body.appendChild(anchor);
    anchor.click();
    document.body.removeChild(anchor);
    URL.revokeObjectURL(url);
}

// HELPERS
