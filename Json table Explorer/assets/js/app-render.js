"use strict";

// UI RENDERING

function renderSelectedFileName() {
    ui.fileName.textContent = state.fileName || "No file selected";
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
    $(".lastcommit").text("n/a");
    $(".lastdate").text("n/a");
    $("#lasthtmlurl").attr("href", "#").addClass("is-disabled");

    if (
        typeof $ === "undefined" ||
        typeof $.getJSON !== "function"
    ) {
        return;
    }

    $.getJSON(
        "https://api.github.com/repos/mttpla/matteopaoli-it/commits",
        function (data) {
            if (!Array.isArray(data) || !data.length) {
                return;
            }

            $(".lastcommit").text(data[0].sha.substr(0, 8));
            $(".lastdate").text(
                data[0].commit.committer.date
                    .replace("T", " ")
                    .replace("Z", " "),
            );
            document
                .getElementById("lasthtmlurl")
                .setAttribute("href", data[0].html_url);
            $("#lasthtmlurl").removeClass("is-disabled");
        },
    ).fail(function () {
        $(".lastcommit").text("n/a");
        $(".lastdate").text("n/a");
        $("#lasthtmlurl").attr("href", "#").addClass("is-disabled");
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
        renderSummaryItem("Column Cap", String(MAX_COLUMNS)),
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
        ui.emptyState.classList.remove("hidden");
        return;
    }

    ui.emptyState.classList.add("hidden");
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

    if (datasetState.ignoredColumnCount > 0) {
        parts.push(
            "ignored columns: " + datasetState.ignoredColumnCount,
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
    ui.applyDepthButton.disabled = isLoading;
    ui.applyPageSizeButton.disabled = isLoading;
    ui.closeSettingsButton.disabled = isLoading;
}

// FILE LOADING
