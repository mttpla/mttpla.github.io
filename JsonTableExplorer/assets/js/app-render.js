"use strict";

// UI RENDERING

function renderSelectedFileName() {
    if (state.inputSource === "paste") {
        ui.fileName.textContent = "Pasted JSON data";
        ui.fileName.classList.add("is-placeholder");
    } else if (state.fileName) {
        ui.fileName.textContent = state.fileName;
        ui.fileName.classList.remove("is-placeholder");
    } else {
        ui.fileName.textContent = "No file selected";
        ui.fileName.classList.add("is-placeholder");
    }
}
function renderLoadingState() {
    ui.loadingOverlay.classList.toggle(
        "is-visible",
        state.ui.loading,
    );
    ui.loadingOverlay.setAttribute(
        "aria-hidden",
        state.ui.loading ? "false" : "true",
    );
}
function renderFooterMetadata() {
    renderCopyrightLabel();
    renderLastCommitInfo();
}
function renderCopyrightLabel() {
    var year = new Date().getFullYear();
    ui.copyrightLabel.textContent =
        "Copyright " + year + " Matteo Paoli";
}
function renderLastCommitInfo() {
    var commitEls = document.querySelectorAll(".lastcommit");
    var dateEls = document.querySelectorAll(".lastdate");
    var linkEl = document.getElementById("lasthtmlurl");

    fetch(
        "https://api.github.com/repos/mttpla/matteopaoli-it/commits",
    )
        .then(function (res) {
            return res.json();
        })
        .then(function (data) {
            if (!Array.isArray(data) || !data.length) {
                return;
            }

            var shortSha = data[0].sha.substr(0, 8);
            state.appCommit = shortSha;
            commitEls.forEach(function (el) {
                el.textContent = shortSha;
            });
            dateEls.forEach(function (el) {
                el.textContent = data[0].commit.committer.date
                    .replace("T", " ")
                    .replace("Z", " ");
            });
            linkEl.setAttribute("href", data[0].html_url);
            linkEl.classList.remove("is-disabled");
        })
        .catch(function () {
            // defaults already show n/a
        });
}
function setLoadingState(isLoading, title, detail) {
    state.ui.loading = isLoading;
    ui.loadingTitle.textContent = title || "Loading";
    ui.loadingDetail.textContent =
        detail || "Working on the current document.";
    renderLoadingState();
    updateControlState();
}
function runBlockingTask(title, detail, work) {
    setLoadingState(true, title, detail);

    window.requestAnimationFrame(function () {
        window.setTimeout(function () {
            try {
                work();
            } finally {
                setLoadingState(false);
            }
        }, 0);
    });
}
function renderMessages() {
    var items = [];

    if (state.error) {
        items.push(
            '<div class="message error">' +
                escapeHtml(state.error) +
                "</div>",
        );
    }

    state.warnings.forEach(function (warning) {
        items.push(
            '<div class="message warning">' +
                escapeHtml(warning) +
                "</div>",
        );
    });

    ui.messages.innerHTML = items.join("");
}
function renderSummarySection() {
    var hasData = state.datasets.length > 0;
    ui.summarySection.hidden = !hasData;

    if (!hasData) {
        ui.summaryGrid.innerHTML = "";
        ui.summaryInline.textContent = "";
        return;
    }

    var totalRows = state.datasets.reduce(function (
        sum,
        datasetState,
    ) {
        return sum + datasetState.rawRowCount;
    }, 0);

    var metadataCount = Object.keys(state.metadata).length;
    var inlineText = [
        "file: " + (state.fileName || "n/a"),
        "tables: " + state.datasets.length,
        "total rows: " + totalRows,
        "metadata fields: " + metadataCount,
        "depth: " + state.settings.flattenDepth,
        "page size: " + state.settings.pageSize,
        "visible columns: " + state.settings.visibleColumnLimit,
    ].join(" · ");

    ui.summaryInline.textContent = inlineText;
    ui.summaryGrid.innerHTML = [
        renderSummaryItem("File", state.fileName || "n/a"),
        renderSummaryItem("Tables", String(state.datasets.length)),
        renderSummaryItem("Total Rows", String(totalRows)),
        renderSummaryItem("Metadata Fields", String(metadataCount)),
        renderSummaryItem(
            "Flatten Depth",
            String(state.settings.flattenDepth),
        ),
        renderSummaryItem(
            "Page Size",
            String(state.settings.pageSize),
        ),
        renderSummaryItem(
            "Visible Columns",
            String(state.settings.visibleColumnLimit),
        ),
    ].join("");

    setSectionState(
        ui.summarySection,
        ui.summaryToggle,
        ui.summaryIcon,
        !state.ui.summaryCollapsed,
    );
}
function renderSummaryItem(label, value) {
    return [
        '<div class="summary-item">',
        '  <span class="summary-key">' +
            escapeHtml(label) +
            "</span>",
        '  <span class="summary-value">' +
            escapeHtml(value) +
            "</span>",
        "</div>",
    ].join("");
}
function renderMetadataSection() {
    var entries = Object.entries(state.metadata);
    ui.metadataSection.hidden = entries.length === 0;

    if (!entries.length) {
        ui.metadataGrid.innerHTML = "";
        ui.metadataInline.textContent = "";
        return;
    }

    ui.metadataInline.textContent =
        entries.length + " flattened fields";
    ui.metadataGrid.innerHTML = entries
        .map(function (entry) {
            return [
                '<div class="metadata-item">',
                '  <span class="metadata-key">' +
                    escapeHtml(entry[0]) +
                    "</span>",
                '  <span class="metadata-value">' +
                    escapeHtml(entry[1]) +
                    "</span>",
                "</div>",
            ].join("");
        })
        .join("");

    setSectionState(
        ui.metadataSection,
        ui.metadataToggle,
        ui.metadataIcon,
        !state.ui.metadataCollapsed,
    );
}
function setSectionState(section, toggle, icon, isOpen) {
    section.classList.toggle("is-open", isOpen);
    toggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    icon.textContent = isOpen ? "-" : "+";
}
function toggleSummarySection() {
    state.ui.summaryCollapsed = !state.ui.summaryCollapsed;
    renderSummarySection();
}
function toggleMetadataSection() {
    state.ui.metadataCollapsed = !state.ui.metadataCollapsed;
    renderMetadataSection();
}
function renderSettingsDrawer() {
    renderSettingsDrawerState();
    ui.flattenDepthInput.value = String(
        state.settings.flattenDepth,
    );
    ui.pageSizeSelect.value = String(state.settings.pageSize);
    ui.visibleColumnLimitInput.value = String(
        state.settings.visibleColumnLimit,
    );

    if (!state.ui.settingsOpen) {
        return;
    }

    if (!state.datasets.length) {
        ui.settingsDatasets.innerHTML =
            '<div class="dataset-empty">Upload a JSON file to configure per-column visibility and aggregations.</div>';
        state.ui.settingsDirty = false;
        return;
    }

    if (!state.ui.settingsDirty) {
        return;
    }

    ui.settingsDatasets.innerHTML = state.datasets
        .map(function (datasetState) {
            var header = [
                '<div class="settings-dataset-head">',
                '  <h4 class="settings-dataset-title">' +
                    escapeHtml(datasetState.name) +
                    "</h4>",
                '  <p class="settings-dataset-meta">' +
                    escapeHtml(buildDatasetMeta(datasetState)) +
                    "</p>",
                "</div>",
            ].join("");

            if (!datasetState.schema.length) {
                return [
                    '<section class="settings-dataset">',
                    header,
                    '<div class="dataset-empty">' +
                        escapeHtml(
                            getDatasetEmptyMessage(datasetState),
                        ) +
                        "</div>",
                    "</section>",
                ].join("");
            }

            var rows = getOrderedSchema(datasetState)
                .map(function (field) {
                    var config = datasetState.columnRegistry[field];
                    return [
                        "<tr>",
                        '  <td class="settings-col-name"><span class="settings-path">' +
                            escapeHtml(field) +
                            "</span></td>",
                        '  <td class="settings-col-visibility"><input class="settings-checkbox" type="checkbox" data-dataset-id="' +
                            escapeHtml(datasetState.id) +
                            '" data-field="' +
                            escapeHtml(field) +
                            '" data-action="visible"' +
                            (config.visible ? " checked" : "") +
                            "></td>",
                        '  <td class="settings-col-type"><span class="settings-type">' +
                            escapeHtml(config.type) +
                            "</span></td>",
                        '  <td class="settings-col-aggregation">' +
                            renderAggregationSelect(
                                datasetState.id,
                                field,
                                config,
                            ) +
                            "</td>",
                        "</tr>",
                    ].join("");
                })
                .join("");

            return [
                '<section class="settings-dataset">',
                header,
                '  <table class="settings-table">',
                "    <thead>",
                "      <tr>",
                '        <th class="settings-col-name">Column</th>',
                '        <th class="settings-col-visibility">Show</th>',
                '        <th class="settings-col-type">Type</th>',
                '        <th class="settings-col-aggregation">Aggregation</th>',
                "      </tr>",
                "    </thead>",
                "    <tbody>" + rows + "</tbody>",
                "  </table>",
                "</section>",
            ].join("");
        })
        .join("");

    state.ui.settingsDirty = false;
}
function renderAggregationSelect(datasetId, field, config) {
    var options = getAggregationOptions(config.type)
        .map(function (option) {
            var selected =
                option.value === config.aggregation
                    ? " selected"
                    : "";
            return (
                '<option value="' +
                escapeHtml(option.value) +
                '"' +
                selected +
                ">" +
                escapeHtml(option.label) +
                "</option>"
            );
        })
        .join("");

    return (
        '<select class="select-input settings-select" data-dataset-id="' +
        escapeHtml(datasetId) +
        '" data-field="' +
        escapeHtml(field) +
        '" data-action="aggregation">' +
        options +
        "</select>"
    );
}
function renderSettingsDrawerState() {
    ui.settingsDrawer.classList.toggle(
        "is-open",
        state.ui.settingsOpen,
    );
    ui.drawerBackdrop.classList.toggle(
        "is-visible",
        state.ui.settingsOpen,
    );
    ui.settingsDrawer.setAttribute(
        "aria-hidden",
        state.ui.settingsOpen ? "false" : "true",
    );
}
function toggleSettingsDrawer() {
    state.ui.settingsOpen = !state.ui.settingsOpen;
    renderSettingsDrawer();
}
function closeSettingsDrawer() {
    state.ui.settingsOpen = false;
    renderSettingsDrawerState();
}
function handleKeydown(event) {
    if (event.key === "Escape" && state.ui.settingsOpen) {
        closeSettingsDrawer();
    }
}
function renderDatasets() {
    if (!state.datasets.length) {
        ui.datasetsContainer.innerHTML = "";
        if (state.ui.pastePanelOpen) {
            ui.emptyState.classList.add("hidden");
            ui.pastePanel.hidden = false;
        } else {
            ui.emptyState.classList.remove("hidden");
            ui.pastePanel.hidden = true;
        }
        return;
    }

    ui.emptyState.classList.add("hidden");
    ui.pastePanel.hidden = true;
    state.ui.pastePanelOpen = false;
    ui.datasetsContainer.innerHTML = state.datasets
        .map(function (datasetState) {
            if (!datasetState.schema.length) {
                return [
                    '<section class="dataset-panel">',
                    '  <div class="dataset-panel-header">',
                    '    <h2 class="dataset-panel-title">' +
                        escapeHtml(datasetState.name) +
                        "</h2>",
                    '    <p class="dataset-panel-subtitle">' +
                        escapeHtml(buildDatasetMeta(datasetState)) +
                        "</p>",
                    "  </div>",
                    '  <div class="dataset-empty">' +
                        escapeHtml(
                            getDatasetEmptyMessage(datasetState),
                        ) +
                        "</div>",
                    "</section>",
                ].join("");
            }

            return [
                '<section class="dataset-panel">',
                '  <div class="dataset-panel-header">',
                '    <h2 class="dataset-panel-title">' +
                    escapeHtml(datasetState.name) +
                    "</h2>",
                '    <p class="dataset-panel-subtitle">' +
                    escapeHtml(buildDatasetMeta(datasetState)) +
                    "</p>",
                "  </div>",
                '  <div class="dataset-table-wrap">',
                '    <div id="table-' +
                    escapeHtml(datasetState.id) +
                    '"></div>',
                "  </div>",
                "</section>",
            ].join("");
        })
        .join("");
}
function buildDatasetMeta(datasetState) {
    var parts = [
        datasetState.rawRowCount + " rows",
        datasetState.schema.length + " columns",
        "source: " +
            (datasetState.path === null
                ? "root array"
                : datasetState.path),
    ];

    if (datasetState.autoHiddenColumnCount > 0) {
        parts.push(
            "auto-hidden columns: " +
                datasetState.autoHiddenColumnCount,
        );
    }

    return parts.join(" · ");
}
function updateControlState() {
    var hasDatasets = state.datasets.length > 0;
    var hasTables = state.datasets.some(function (datasetState) {
        return Boolean(datasetState.table);
    });
    var isLoading = state.ui.loading;

    ui.globalSearch.disabled = !hasTables || isLoading;
    ui.settingsButton.disabled = isLoading;
    ui.resetButton.disabled = !hasDatasets || isLoading;
    ui.exportButton.disabled = !hasTables || isLoading;
    ui.downloadJsonButton.disabled = !hasDatasets || isLoading;
    ui.applyDepthButton.disabled = isLoading;
    ui.applyPageSizeButton.disabled = isLoading;
    ui.applyVisibleColumnLimitButton.disabled = isLoading;
    ui.closeSettingsButton.disabled = isLoading;
    ui.topbarPasteButton.disabled = isLoading;
    ui.pasteLoadButton.disabled = isLoading;
}

// PASTE PANEL

function openPastePanel() {
    state.ui.pastePanelOpen = true;
    ui.emptyState.classList.add("hidden");
    ui.pastePanel.hidden = false;
    ui.pasteTextarea.value = "";
    ui.pasteTextarea.focus();
}
function closePastePanel() {
    state.ui.pastePanelOpen = false;
    ui.pastePanel.hidden = true;
    ui.pasteTextarea.value = "";
    if (!state.datasets.length) {
        ui.emptyState.classList.remove("hidden");
    }
}

// FILE LOADING
