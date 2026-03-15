"use strict";

// ORIGINAL JSON TREE VIEW

function renderJsonTreeSection() {
    var hasJson = state.originalJson !== null;
    ui.jsonTreeSection.hidden = !hasJson;

    if (!hasJson) {
        ui.jsonTreeInline.textContent = "";
        ui.jsonTreeContent.innerHTML = "";
        return;
    }

    ui.jsonTreeInline.textContent = describeJsonNode(state.originalJson);
    ui.jsonTreeContent.innerHTML = renderJsonTreeNode(
        state.originalJson,
        "root",
        true,
    );

    setSectionState(
        ui.jsonTreeSection,
        ui.jsonTreeToggle,
        ui.jsonTreeIcon,
        !state.ui.jsonTreeCollapsed,
    );
}
function toggleJsonTreeSection() {
    state.ui.jsonTreeCollapsed = !state.ui.jsonTreeCollapsed;
    renderJsonTreeSection();
}
function renderJsonTreeNode(value, key, isRoot) {
    var keyLabel = isRoot
        ? '<span class="json-tree-key">root</span>'
        : '<span class="json-tree-key">' +
          escapeHtml(String(key)) +
          "</span>";

    if (Array.isArray(value)) {
        return [
            '<div class="json-tree-node">',
            "  <details>",
            "    <summary>" +
                keyLabel +
                ' <span class="json-tree-meta">array[' +
                value.length +
                "]</span></summary>",
            '    <div class="json-tree-children">' +
                value
                    .map(function (item, index) {
                        return renderJsonTreeNode(
                            item,
                            "[" + index + "]",
                            false,
                        );
                    })
                    .join("") +
                "</div>",
            "  </details>",
            "</div>",
        ].join("");
    }

    if (isPlainObject(value)) {
        var objectKeys = Object.keys(value);
        return [
            '<div class="json-tree-node">',
            "  <details>",
            "    <summary>" +
                keyLabel +
                ' <span class="json-tree-meta">object {' +
                objectKeys.length +
                "}</span></summary>",
            '    <div class="json-tree-children">' +
                objectKeys
                    .map(function (childKey) {
                        return renderJsonTreeNode(
                            value[childKey],
                            childKey,
                            false,
                        );
                    })
                    .join("") +
                "</div>",
            "  </details>",
            "</div>",
        ].join("");
    }

    return [
        '<div class="json-tree-leaf">',
        keyLabel,
        ': <span class="json-tree-value ' +
            escapeHtml(getJsonValueType(value)) +
            '">' +
            escapeHtml(formatJsonLeafValue(value)) +
            "</span>",
        "</div>",
    ].join("");
}
function describeJsonNode(value) {
    if (Array.isArray(value)) {
        return "array[" + value.length + "]";
    }

    if (isPlainObject(value)) {
        return "object {" + Object.keys(value).length + "}";
    }

    return getJsonValueType(value);
}
function getJsonValueType(value) {
    if (value === null) {
        return "null";
    }

    if (typeof value === "boolean") {
        return "boolean";
    }

    if (typeof value === "number") {
        return "number";
    }

    return "string";
}
function formatJsonLeafValue(value) {
    if (value === null) {
        return "null";
    }

    if (typeof value === "string") {
        return '"' + value + '"';
    }

    return String(value);
}
