"use strict";

// SHARED UTILITIES

function isPlainObject(value) {
    return (
        value !== null &&
        typeof value === "object" &&
        !Array.isArray(value)
    );
}
function isNumericLike(value) {
    if (typeof value === "number") {
        return Number.isFinite(value);
    }

    if (typeof value === "string") {
        var trimmed = value.trim();
        return trimmed !== "" && Number.isFinite(Number(trimmed));
    }

    return false;
}
function stringifyValue(value) {
    try {
        return JSON.stringify(value);
    } catch (error) {
        return String(value);
    }
}
function stringifyRecord(record) {
    var stringified = {};

    Object.keys(record).forEach(function (key) {
        var value = record[key];
        stringified[key] = value === null ? "null" : String(value);
    });

    return stringified;
}
function escapeHtml(value) {
    return String(value)
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}
function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
}
function numericCalcFormatter(cell, formatterParams) {
    var value = cell.getValue();

    if (value === null || value === undefined || value === "") {
        return "";
    }

    var rounded = Number(value);
    if (!Number.isFinite(rounded)) {
        return "";
    }

    var label =
        formatterParams && formatterParams.label
            ? String(formatterParams.label) + " "
            : "";

    if (Math.abs(rounded % 1) < 0.000001) {
        return label + rounded.toLocaleString();
    }

    return label + rounded.toFixed(2);
}
function integerCalcFormatter(cell, formatterParams) {
    var value = cell.getValue();

    if (value === null || value === undefined || value === "") {
        return "";
    }

    var label =
        formatterParams && formatterParams.label
            ? String(formatterParams.label) + " "
            : "";
    return label + Number(value).toLocaleString();
}
