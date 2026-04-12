"use strict";

// DATA PIPELINE

function handlePasteInput() {
    var text = ui.pasteTextarea.value.trim();
    if (!text) {
        return;
    }

    closePastePanel();
    resetLoadedDocument(false);
    state.fileName = "pasted-json";
    state.inputSource = "paste";
    renderSelectedFileName();
    renderSummarySection();

    runBlockingTask(
        "Rendering tables",
        "Parsing JSON and building datasets.",
        function () {
            processJsonDocument(text, "pasted-json");
        },
    );
}
function handleFileSelection(event) {
    var file = event.target.files && event.target.files[0];
    if (!file) {
        return;
    }

    ui.fileInput.value = "";
    resetLoadedDocument(false);
    state.fileName = file.name;
    state.inputSource = "file";
    renderSelectedFileName();
    renderSummarySection();
    setLoadingState(
        true,
        "Loading JSON",
        "Reading the selected file.",
    );

    readFileAsText(file)
        .then(function (text) {
            runBlockingTask(
                "Rendering tables",
                "Parsing JSON and building datasets.",
                function () {
                    processJsonDocument(text, file.name);
                },
            );
        })
        .catch(function (error) {
            setLoadingState(false);
            handleLoadError(
                error instanceof Error
                    ? error.message
                    : "Unable to read the selected file.",
            );
        });
}
function readFileAsText(file) {
    return new Promise(function (resolve, reject) {
        var reader = new FileReader();

        reader.onload = function () {
            resolve(String(reader.result || ""));
        };

        reader.onerror = function () {
            reject(new Error("Unable to read the selected file."));
        };

        reader.readAsText(file);
    });
}
function processJsonDocument(text, fileName) {
    var root;

    try {
        root = JSON.parse(text);
    } catch (error) {
        handleLoadError(
            "Invalid JSON. The file could not be parsed.",
        );
        return;
    }

    var detected = detectTopLevelDatasets(root);

    if (!detected.datasets.length) {
        handleLoadError(
            "No top-level arrays detected. Provide a root array or a root object containing one or more first-level arrays.",
            {
                keepOriginalJson: true,
                originalJson: root,
                jsonTreeCollapsed: false,
                fileName: fileName,
            },
        );
        return;
    }

    destroyAllTables();

    state.fileName = fileName;
    state.rawDatasets = detected.datasets;
    state.metadata = detected.metadata;
    state.originalJson = root;
    state.error = "";
    state.searchTerm = "";
    state.settings.flattenDepth = DEFAULT_FLATTEN_DEPTH;
    state.settings.pageSize = DEFAULT_PAGE_SIZE;
    state.settings.visibleColumnLimit =
        DEFAULT_VISIBLE_COLUMN_LIMIT;
    state.ui.settingsDirty = true;
    state.ui.summaryCollapsed = true;
    state.ui.metadataCollapsed = false;
    state.ui.jsonTreeCollapsed = true;
    ui.globalSearch.value = "";

    rebuildDatasetsFromRaw();
    renderSelectedFileName();
}
function handleLoadError(message, options) {
    var opts = options || {};
    var keepOriginalJson = Boolean(opts.keepOriginalJson);
    var originalJson = keepOriginalJson
        ? opts.originalJson || null
        : null;
    var jsonTreeCollapsed =
        typeof opts.jsonTreeCollapsed === "boolean"
            ? opts.jsonTreeCollapsed
            : true;

    if (typeof opts.fileName === "string") {
        state.fileName = opts.fileName;
    }

    resetLoadedDocument(false);

    if (keepOriginalJson) {
        state.originalJson = originalJson;
        state.ui.jsonTreeCollapsed = jsonTreeCollapsed;
    }

    state.error = message;
    state.ui.settingsDirty = true;
    renderMessages();
    renderSummarySection();
    renderMetadataSection();
    renderJsonTreeSection();
    renderSettingsDrawer();
    renderDatasets();
    updateControlState();
}
function resetLoadedDocument(clearFileName) {
    destroyAllTables();
    state.dataset = [];
    state.schema = [];
    state.columnRegistry = {};
    state.metadata = {};
    state.originalJson = null;
    state.table = null;
    state.rawDatasets = [];
    state.datasets = [];
    state.warnings = [];
    state.error = "";
    state.searchTerm = "";
    state.settings.flattenDepth = DEFAULT_FLATTEN_DEPTH;
    state.settings.pageSize = DEFAULT_PAGE_SIZE;
    state.settings.visibleColumnLimit =
        DEFAULT_VISIBLE_COLUMN_LIMIT;
    state.ui.settingsDirty = true;
    state.ui.summaryCollapsed = true;
    state.ui.metadataCollapsed = false;
    state.ui.jsonTreeCollapsed = true;
    state.ui.pastePanelOpen = false;

    if (clearFileName) {
        state.fileName = "";
        state.inputSource = "";
    }

    ui.globalSearch.value = "";
    ui.pasteTextarea.value = "";
    ui.pastePanel.hidden = true;
    renderSelectedFileName();
    renderMessages();
    renderSummarySection();
    renderMetadataSection();
    renderJsonTreeSection();
    renderSettingsDrawer();
    renderDatasets();
    updateControlState();
}

// ROW DETECTION
function detectTopLevelDatasets(root) {
    if (Array.isArray(root)) {
        return {
            datasets: [
                {
                    id: createDatasetId("root-array", 0),
                    name: "root array",
                    path: null,
                    rows: root,
                },
            ],
            metadata: {},
        };
    }

    if (!isPlainObject(root)) {
        return { datasets: [], metadata: {} };
    }

    var datasets = [];
    var metadataSource = {};

    Object.keys(root).forEach(function (key, index) {
        var value = root[key];

        if (Array.isArray(value)) {
            datasets.push({
                id: createDatasetId(key, index),
                name: key,
                path: key,
                rows: value,
            });
            return;
        }

        metadataSource[key] = value;
    });

    if (!datasets.length) {
        datasets = [];
        metadataSource = {};

        Object.keys(root).forEach(function (key, index) {
            var value = root[key];

            if (isPlainObject(value)) {
                var nestedDataset = detectNestedDatasetInBranch(
                    value,
                    key,
                    index,
                );
                if (nestedDataset) {
                    datasets.push(nestedDataset);
                    return;
                }
            }

            metadataSource[key] = value;
        });
    }

    return {
        datasets: datasets,
        metadata: flattenMetadata(metadataSource),
    };
}
function detectNestedDatasetInBranch(
    branchValue,
    branchKey,
    index,
) {
    return findNestedDataset(branchValue, branchKey, index, {});
}
function findNestedDataset(
    container,
    currentPath,
    index,
    inheritedContext,
) {
    if (!isPlainObject(container)) {
        return null;
    }

    var keys = Object.keys(container);

    for (var i = 0; i < keys.length; i += 1) {
        var key = keys[i];
        var value = container[key];
        var objectItems = getObjectItemsFromArray(value);

        if (objectItems.length) {
            var datasetPath = currentPath
                ? currentPath + "." + key
                : key;
            var localContext = buildContextWithoutArrays(
                container,
                key,
            );
            var mergedContext = mergePlainObjects(
                inheritedContext,
                localContext,
            );

            return {
                id: createDatasetId(datasetPath, index),
                name: datasetPath,
                path: datasetPath,
                rows: objectItems.map(function (item) {
                    return mergePlainObjects(mergedContext, item);
                }),
            };
        }
    }

    for (var j = 0; j < keys.length; j += 1) {
        var nestedKey = keys[j];
        var nestedValue = container[nestedKey];

        if (!isPlainObject(nestedValue)) {
            continue;
        }

        var nextPath = currentPath
            ? currentPath + "." + nestedKey
            : nestedKey;
        var nextContext = mergePlainObjects(
            inheritedContext,
            buildContextWithoutArrays(container, nestedKey),
        );
        var nestedDataset = findNestedDataset(
            nestedValue,
            nextPath,
            index,
            nextContext,
        );

        if (nestedDataset) {
            return nestedDataset;
        }
    }

    return null;
}
function buildContextWithoutArrays(source, excludedKey) {
    var context = {};

    Object.keys(source).forEach(function (key) {
        if (key === excludedKey) {
            return;
        }

        var value = source[key];
        if (Array.isArray(value)) {
            return;
        }

        context[key] = value;
    });

    return context;
}
function getObjectItemsFromArray(value) {
    if (!Array.isArray(value) || !value.length) {
        return [];
    }

    return value.filter(function (item) {
        return isPlainObject(item);
    });
}
function mergePlainObjects(base, extension) {
    var result = {};
    var baseObject = isPlainObject(base) ? base : {};
    var extensionObject = isPlainObject(extension) ? extension : {};

    Object.keys(baseObject).forEach(function (key) {
        result[key] = baseObject[key];
    });

    Object.keys(extensionObject).forEach(function (key) {
        if (
            isPlainObject(result[key]) &&
            isPlainObject(extensionObject[key])
        ) {
            result[key] = mergePlainObjects(
                result[key],
                extensionObject[key],
            );
            return;
        }

        result[key] = extensionObject[key];
    });

    return result;
}
function expandRowsForNestedArrays(rows) {
    var expanded = [];

    rows.forEach(function (row) {
        expandSingleRow(row).forEach(function (expandedRow) {
            expanded.push(expandedRow);
        });
    });

    return expanded;
}
function expandSingleRow(row) {
    if (!isPlainObject(row)) {
        return [row];
    }

    var nestedField = Object.keys(row).find(function (key) {
        return getObjectItemsFromArray(row[key]).length > 0;
    });

    if (!nestedField) {
        return [row];
    }

    var nestedItems = getObjectItemsFromArray(row[nestedField]);

    if (!nestedItems.length) {
        return [row];
    }

    return nestedItems.map(function (item) {
        var nextRow = {};

        Object.keys(row).forEach(function (key) {
            nextRow[key] = key === nestedField ? item : row[key];
        });

        return nextRow;
    });
}

// METADATA HANDLING
function flattenMetadata(source) {
    var result = {};
    flattenMetadataValue(source, "", result);
    return stringifyRecord(result);
}
function flattenMetadataValue(value, path, target) {
    if (value === undefined || value === null) {
        if (path) {
            target[path] = null;
        }
        return;
    }

    if (Array.isArray(value)) {
        flattenMetadataArray(value, path, target);
        return;
    }

    if (isPlainObject(value)) {
        var keys = Object.keys(value);

        if (!keys.length && path) {
            target[path] = "{}";
        }

        keys.forEach(function (key) {
            var nextPath = path ? path + "." + key : key;
            flattenMetadataValue(value[key], nextPath, target);
        });

        return;
    }

    if (path) {
        target[path] = value;
    }
}
function flattenMetadataArray(values, path, target) {
    if (!values.length) {
        if (path) {
            target[path] = "";
        }
        return;
    }

    var containsStructuredItems = values.some(function (item) {
        return Array.isArray(item) || isPlainObject(item);
    });

    if (!containsStructuredItems) {
        target[path] = joinArrayValues(values);
        return;
    }

    values.forEach(function (item, index) {
        var indexedPath = path
            ? path + "[" + index + "]"
            : "[" + index + "]";
        flattenMetadataValue(item, indexedPath, target);
    });
}

// DATA NORMALIZATION
function rebuildDatasetsFromRaw() {
    destroyAllTables();
    state.datasets = state.rawDatasets.map(function (entry) {
        return buildDatasetState(
            entry,
            state.settings.flattenDepth,
        );
    });
    state.warnings = collectWarnings(state.datasets);
    state.ui.settingsDirty = true;
    syncPrimaryState();
    renderMessages();
    renderSummarySection();
    renderMetadataSection();
    renderJsonTreeSection();
    renderSettingsDrawer();
    renderDatasets();
    initializeAllTables();
    updateControlState();
}
function buildDatasetState(entry, flattenDepth) {
    var preparedRows = Array.isArray(entry.rows)
        ? expandRowsForNestedArrays(entry.rows)
        : [];
    var datasetState = {
        id: entry.id,
        name: entry.name,
        path: entry.path,
        rawRowCount: preparedRows.length,
        dataset: [],
        schema: [],
        columnRegistry: {},
        totalDetectedColumns: 0,
        autoHiddenColumnCount: 0,
        warnings: [],
        columnOrder: [],
        table: null,
    };

    if (!preparedRows.length) {
        datasetState.warnings.push(
            'Dataset "' + entry.name + '" is empty.',
        );
        return datasetState;
    }

    var normalizedRows = normalizeRows(preparedRows, flattenDepth);
    var discovery = discoverSchema(
        normalizedRows,
        state.settings.visibleColumnLimit,
    );

    if (!discovery.schema.length) {
        datasetState.warnings.push(
            'Dataset "' +
                entry.name +
                '" has no detectable columns.',
        );
        return datasetState;
    }

    var columnTypes = detectColumnTypes(
        normalizedRows,
        discovery.schema,
    );

    datasetState.dataset = projectRowsToSchema(
        normalizedRows,
        discovery.schema,
        columnTypes,
    );
    datasetState.schema = discovery.schema;
    datasetState.columnRegistry = createColumnRegistry(
        discovery.schema,
        columnTypes,
        state.settings.visibleColumnLimit,
    );
    datasetState.totalDetectedColumns = discovery.totalColumns;
    datasetState.autoHiddenColumnCount =
        discovery.autoHiddenColumns;
    datasetState.columnOrder = discovery.schema.slice();

    if (discovery.warning) {
        datasetState.warnings.push(
            'Dataset "' + entry.name + '": ' + discovery.warning,
        );
    }

    return datasetState;
}
function normalizeRows(rows, flattenDepth) {
    return rows.map(function (row) {
        return normalizeSingleRow(row, flattenDepth);
    });
}
function normalizeSingleRow(row, flattenDepth) {
    if (isPlainObject(row)) {
        var normalized = {};
        flattenStructure(row, "", 0, normalized, flattenDepth);

        if (Object.keys(normalized).length) {
            return normalized;
        }
    }

    var wrapped = {};
    wrapped[VALUE_FIELD] = normalizeLeafValue(row);
    return wrapped;
}
function flattenStructure(
    value,
    prefix,
    depth,
    target,
    flattenDepth,
) {
    if (!isPlainObject(value)) {
        return;
    }

    Object.keys(value).forEach(function (key) {
        var nextPath = prefix ? prefix + "." + key : key;
        assignFlattenedValue(
            target,
            nextPath,
            value[key],
            depth + 1,
            flattenDepth,
        );
    });
}
function assignFlattenedValue(
    target,
    path,
    value,
    depth,
    flattenDepth,
) {
    if (value === undefined || value === null) {
        target[path] = null;
        return;
    }

    if (Array.isArray(value)) {
        target[path] = joinArrayValues(value);
        return;
    }

    if (isPlainObject(value)) {
        if (depth < flattenDepth) {
            flattenStructure(
                value,
                path,
                depth,
                target,
                flattenDepth,
            );
            return;
        }

        target[path] = stringifyValue(value);
        return;
    }

    target[path] = value;
}
function normalizeLeafValue(value) {
    if (value === undefined || value === null) {
        return null;
    }

    if (Array.isArray(value)) {
        return joinArrayValues(value);
    }

    if (isPlainObject(value)) {
        return stringifyValue(value);
    }

    return value;
}
function joinArrayValues(values) {
    return values
        .map(function (item) {
            if (item === undefined || item === null) {
                return "";
            }

            if (Array.isArray(item) || isPlainObject(item)) {
                return stringifyValue(item);
            }

            return String(item);
        })
        .filter(function (part) {
            return part !== "";
        })
        .join(", ");
}

// SCHEMA DISCOVERY
function discoverSchema(rows, visibleColumnLimit) {
    var seen = new Set();
    var columns = [];

    rows.forEach(function (row) {
        Object.keys(row).forEach(function (key) {
            if (!seen.has(key)) {
                seen.add(key);
                columns.push(key);
            }
        });
    });

    var totalColumns = columns.length;
    var schema = columns.slice();
    var autoHiddenColumns = computeAutoHiddenColumnCount(
        totalColumns,
        visibleColumnLimit,
    );
    var warning = buildVisibleColumnLimitWarning(
        totalColumns,
        visibleColumnLimit,
    );

    return {
        schema: schema,
        totalColumns: totalColumns,
        autoHiddenColumns: autoHiddenColumns,
        warning: warning,
    };
}
function detectColumnTypes(rows, schema) {
    var types = {};

    schema.forEach(function (field) {
        var hasValue = false;
        var numericOnly = true;

        rows.forEach(function (row) {
            var value = row[field];
            if (value === null || value === undefined) {
                return;
            }

            hasValue = true;

            if (!isNumericLike(value)) {
                numericOnly = false;
            }
        });

        types[field] =
            hasValue && numericOnly ? "number" : "string";
    });

    return types;
}
function projectRowsToSchema(rows, schema, columnTypes) {
    return rows.map(function (row) {
        var projected = {};

        schema.forEach(function (field) {
            var value = Object.prototype.hasOwnProperty.call(
                row,
                field,
            )
                ? row[field]
                : null;

            if (value === undefined) {
                value = null;
            }

            if (columnTypes[field] === "number") {
                projected[field] =
                    value === null || value === ""
                        ? null
                        : Number(value);
            } else {
                projected[field] =
                    value === null ? null : String(value);
            }
        });

        return projected;
    });
}

// COLUMN REGISTRY
function createColumnRegistry(
    schema,
    columnTypes,
    visibleColumnLimit,
) {
    var registry = {};

    schema.forEach(function (field, index) {
        registry[field] = {
            type: columnTypes[field],
            visible: index < visibleColumnLimit,
            aggregation:
                columnTypes[field] === "number" ? "avg" : "none",
        };
    });

    return registry;
}
function getAggregationOptions(type) {
    var options = [
        { value: "none", label: "none" },
        { value: "row count", label: "row count" },
    ];

    if (type === "number") {
        options.splice(
            1,
            0,
            { value: "sum", label: "sum" },
            { value: "avg", label: "avg" },
        );
    }

    if (type === "string") {
        options.push({
            value: "distinct values",
            label: "distinct values",
        });
    }

    return options;
}
function getOrderedSchema(datasetState) {
    if (!datasetState.columnOrder.length) {
        return datasetState.schema.slice();
    }

    var ordered = datasetState.columnOrder.filter(function (field) {
        return datasetState.schema.indexOf(field) !== -1;
    });

    datasetState.schema.forEach(function (field) {
        if (ordered.indexOf(field) === -1) {
            ordered.push(field);
        }
    });

    return ordered;
}
function computeAutoHiddenColumnCount(
    totalColumns,
    visibleColumnLimit,
) {
    return Math.max(totalColumns - visibleColumnLimit, 0);
}
function buildVisibleColumnLimitWarning(
    totalColumns,
    visibleColumnLimit,
) {
    var autoHiddenColumns = computeAutoHiddenColumnCount(
        totalColumns,
        visibleColumnLimit,
    );

    if (autoHiddenColumns <= 0) {
        return "";
    }

    return (
        "Too many columns detected (" +
        totalColumns +
        "). Showing the first " +
        visibleColumnLimit +
        " columns by default and keeping " +
        autoHiddenColumns +
        " additional columns hidden in Settings."
    );
}
function applyVisibleColumnLimitToDataset(
    datasetState,
    visibleColumnLimit,
) {
    var orderedSchema = getOrderedSchema(datasetState);

    orderedSchema.forEach(function (field, index) {
        if (datasetState.columnRegistry[field]) {
            datasetState.columnRegistry[field].visible =
                index < visibleColumnLimit;
        }
    });

    datasetState.autoHiddenColumnCount =
        computeAutoHiddenColumnCount(
            orderedSchema.length,
            visibleColumnLimit,
        );

    if (!datasetState.rawRowCount || !orderedSchema.length) {
        return;
    }

    var warning = buildVisibleColumnLimitWarning(
        orderedSchema.length,
        visibleColumnLimit,
    );
    datasetState.warnings = warning
        ? ['Dataset "' + datasetState.name + '": ' + warning]
        : [];
}
function getVisibleFields(datasetState) {
    return getOrderedSchema(datasetState).filter(function (field) {
        return (
            datasetState.columnRegistry[field] &&
            datasetState.columnRegistry[field].visible
        );
    });
}

// TABLE GENERATION
function syncPrimaryState() {
    var primary =
        state.datasets.find(function (datasetState) {
            return datasetState.schema.length > 0;
        }) || null;

    state.dataset = primary ? primary.dataset : [];
    state.schema = primary ? primary.schema : [];
    state.columnRegistry = primary ? primary.columnRegistry : {};
    state.table = primary ? primary.table : null;
}
function collectWarnings(datasets) {
    var warnings = [];

    datasets.forEach(function (datasetState) {
        datasetState.warnings.forEach(function (warning) {
            warnings.push(warning);
        });
    });

    return warnings;
}
function getDatasetById(datasetId) {
    return (
        state.datasets.find(function (datasetState) {
            return datasetState.id === datasetId;
        }) || null
    );
}
function getDatasetEmptyMessage(datasetState) {
    if (!datasetState.rawRowCount) {
        return "This top-level array is empty.";
    }

    if (!datasetState.schema.length) {
        return "No columns were detected for this array.";
    }

    return "No visible columns selected. Re-enable at least one column from Settings.";
}
function createDatasetId(name, index) {
    return sanitizeFilePart(name || "dataset") + "-" + index;
}
function buildExportBaseName(fileName) {
    return sanitizeFilePart(
        String(fileName).replace(/\.[^.]+$/, "") || "data",
    );
}
function sanitizeFilePart(value) {
    return (
        String(value)
            .trim()
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "") || "data"
    );
}
