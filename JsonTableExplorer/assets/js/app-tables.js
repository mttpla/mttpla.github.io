"use strict";

// TABULATOR INTEGRATION

function initializeAllTables() {
    state.datasets.forEach(function (datasetState) {
        createOrRefreshTable(datasetState, true);
    });

    syncPrimaryState();
    updateControlState();
}
function createOrRefreshTable(datasetState, rebuildFromScratch) {
    if (!datasetState.schema.length) {
        return;
    }

    var tableElement = document.getElementById(
        "table-" + datasetState.id,
    );
    if (!tableElement) {
        return;
    }

    var columns = buildColumns(datasetState);
    if (!columns.length) {
        destroyDatasetTable(datasetState);
        tableElement.innerHTML =
            '<div class="dataset-empty">No visible columns selected. Re-enable at least one column from Settings.</div>';
        return;
    }

    if (!datasetState.table || rebuildFromScratch) {
        destroyDatasetTable(datasetState);
        tableElement.innerHTML = "";
        datasetState.table = new Tabulator(tableElement, {
            data: datasetState.dataset,
            columns: columns,
            layout: "fitColumns",
            nestedFieldSeparator: false,
            pagination: "local",
            paginationSize: state.settings.pageSize,
            movableColumns: true,
            resizableColumns: true,
            placeholder: "No rows to display",
            maxHeight:
                computeDatasetTableMaxHeight(datasetState) + "px",
        });

        datasetState.table.on("columnMoved", function () {
            syncColumnOrder(datasetState);
        });
    } else {
        datasetState.table.setColumns(columns);
        datasetState.table.setPageSize(state.settings.pageSize);
        datasetState.table.setPage(1);
        datasetState.table.redraw(true);
    }

    applyGlobalSearchFilterToDataset(datasetState);
}
function buildColumns(datasetState) {
    return getVisibleFields(datasetState).map(function (field) {
        var config = datasetState.columnRegistry[field];
        var column = {
            title: field,
            field: field,
            headerFilter: "input",
            headerTooltip: field,
            sorter: config.type === "number" ? "number" : "string",
            minWidth: config.type === "number" ? 130 : 170,
        };

        if (config.type === "number") {
            column.hozAlign = "right";
        } else {
            column.formatter = "textarea";
            column.variableHeight = true;
        }

        applyAggregationToColumn(column, config.aggregation);
        return column;
    });
}
function applyAggregationToColumn(column, aggregation) {
    if (!aggregation || aggregation === "none") {
        return;
    }

    if (aggregation === "sum") {
        column.bottomCalc = "sum";
        column.bottomCalcFormatter = numericCalcFormatter;
        column.bottomCalcFormatterParams = { label: "SUM" };
        return;
    }

    if (aggregation === "avg") {
        column.bottomCalc = "avg";
        column.bottomCalcFormatter = numericCalcFormatter;
        column.bottomCalcFormatterParams = { label: "AVG" };
        return;
    }

    if (aggregation === "row count") {
        column.bottomCalc = function (values) {
            return values.length;
        };
        column.bottomCalcFormatter = integerCalcFormatter;
        column.bottomCalcFormatterParams = { label: "COUNT" };
        return;
    }

    if (aggregation === "distinct values") {
        column.bottomCalc = function (values) {
            var distinct = new Set();
            values.forEach(function (value) {
                if (
                    value !== null &&
                    value !== undefined &&
                    String(value).trim() !== ""
                ) {
                    distinct.add(String(value));
                }
            });
            return distinct.size;
        };
        column.bottomCalcFormatter = integerCalcFormatter;
        column.bottomCalcFormatterParams = { label: "DISTINCT" };
    }
}
function computeDatasetTableMaxHeight(datasetState) {
    var visibleRows = Math.min(
        Math.max(datasetState.dataset.length, 1),
        state.settings.pageSize,
    );
    var bodyHeight = visibleRows * TABLE_ROW_HEIGHT;
    var footerHeight = datasetHasAggregation(datasetState)
        ? TABLE_FOOTER_HEIGHT
        : 0;
    var paginationHeight =
        datasetState.dataset.length > state.settings.pageSize
            ? TABLE_PAGINATION_HEIGHT
            : 0;
    return (
        TABLE_HEADER_HEIGHT +
        bodyHeight +
        footerHeight +
        paginationHeight
    );
}
function datasetHasAggregation(datasetState) {
    return getVisibleFields(datasetState).some(function (field) {
        return (
            datasetState.columnRegistry[field].aggregation !==
            "none"
        );
    });
}
function destroyDatasetTable(datasetState) {
    if (datasetState.table) {
        datasetState.table.destroy();
        datasetState.table = null;
    }
}
function destroyAllTables() {
    state.datasets.forEach(function (datasetState) {
        destroyDatasetTable(datasetState);
    });
}
function syncColumnOrder(datasetState) {
    if (!datasetState.table) {
        return;
    }

    var visibleFields = datasetState.table
        .getColumns()
        .map(function (column) {
            return column.getField();
        })
        .filter(Boolean);

    var hiddenFields = getOrderedSchema(datasetState).filter(
        function (field) {
            return visibleFields.indexOf(field) === -1;
        },
    );

    datasetState.columnOrder = visibleFields.concat(hiddenFields);
    syncPrimaryState();
}
function applyGlobalSearchFilter() {
    state.datasets.forEach(function (datasetState) {
        applyGlobalSearchFilterToDataset(datasetState);
    });
}
function applyGlobalSearchFilterToDataset(datasetState) {
    if (!datasetState.table) {
        return;
    }

    var term = state.searchTerm.trim().toLowerCase();

    if (!term) {
        datasetState.table.clearFilter();
        return;
    }

    datasetState.table.setFilter(function (rowData) {
        return datasetState.schema.some(function (field) {
            var value = rowData[field];
            return (
                value !== null &&
                value !== undefined &&
                String(value).toLowerCase().indexOf(term) !== -1
            );
        });
    });
}

// EVENT HANDLERS
