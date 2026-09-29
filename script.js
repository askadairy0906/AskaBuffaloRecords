const API_BASE = "https://aska-dairy-api.kk862781.workers.dev";

async function apiRequest(path, options = {}) {

    const method =
        String(options.method || "GET").toUpperCase();

    if (method !== "GET" && !isLoggedIn) {
        throw new Error(
            "Please login to perform this action."
        );
    }

    const response = await fetch(
        API_BASE + path,
        {
            ...options,
            headers: {
                "Content-Type": "application/json",
                ...(options.headers || {})
            }
        }
    );

    let result = null;

    try {
        result = await response.json();
    } catch (error) {
        result = null;
    }

    if (!response.ok) {
        throw new Error(
            result?.error ||
            `API request failed (${response.status})`
        );
    }

    return result;
}


/* ==========================================================
   GLOBAL VARIABLES
========================================================== */

let records = [];
let registry = [];
let auditLogs = [];

let currentUser = "";
let isLoggedIn = false;


/* ==========================================================
   HELPERS
========================================================== */

const $ = id =>
    document.getElementById(id);


function esc(value) {

    return String(
        value ?? ""
    ).replace(
        /[&<>"']/g,
        c => ({
            "&": "&amp;",
            "<": "&lt;",
            ">": "&gt;",
            '"': "&quot;",
            "'": "&#039;"
        }[c])
    );

}


function normalized(value) {

    return String(
        value ?? ""
    )
        .trim()
        .toLowerCase();

}


function todayStart() {

    const d =
        new Date();

    return new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate()
    );

}


function daysElapsed(dateString) {

    if (!dateString)

        return null;

    const d =
        new Date(
            dateString + "T00:00:00"
        );

    if (
        Number.isNaN(
            d.getTime()
        )
    )

        return null;

    return Math.floor(
        (
            todayStart() -
            d
        ) /
        86400000
    );

}

/* ==========================================================
   FORMAT ELAPSED TIME AS MONTHS + DAYS
   Example:
   27-07-2026 → 1m 23d
   09-12-2025 → 9m 10d
   19-03-2026 → 6m
========================================================== */

function formatElapsedDuration(dateString) {

    if (!dateString)
        return "N/A";

    const start = new Date(
        dateString + "T00:00:00"
    );

    if (Number.isNaN(start.getTime()))
        return "N/A";

    const today = todayStart();

    if (start > today)
        return "0d";

    let months =
        (today.getFullYear() - start.getFullYear()) * 12 +
        (today.getMonth() - start.getMonth());

    const monthDate = new Date(start);

    monthDate.setMonth(
        monthDate.getMonth() + months
    );

    if (monthDate > today) {

        months--;

        monthDate.setMonth(
            monthDate.getMonth() - 1
        );
    }

    const remainingDays =
        Math.floor(
            (today.getTime() - monthDate.getTime()) /
            86400000
        );

    if (months > 0 && remainingDays > 0) {
        return `${months}m ${remainingDays}d`;
    }

    if (months > 0) {
        return `${months}m`;
    }

    return `${remainingDays}d`;
}


/* ==========================================================
   CALENDAR MONTH / DAY DURATION
   Example:
   1m 23d
   9m 10d
========================================================== */

function formatElapsedDuration(
    dateString
) {

    if (!dateString)

        return "N/A";

    const parts =
        String(
            dateString
        ).split("-");

    if (
        parts.length !== 3
    )

        return "N/A";

    const year =
        Number(parts[0]);

    const month =
        Number(parts[1]);

    const day =
        Number(parts[2]);

    if (
        !Number.isInteger(year) ||
        !Number.isInteger(month) ||
        !Number.isInteger(day)
    )

        return "N/A";

    const start =
        new Date(
            year,
            month - 1,
            day
        );

    const today =
        todayStart();

    if (
        Number.isNaN(
            start.getTime()
        )
    )

        return "N/A";

    if (start > today)

        return "0d";


    let months =
        (
            today.getFullYear() -
            start.getFullYear()
        ) *
        12 +
        (
            today.getMonth() -
            start.getMonth()
        );


    const daysInMonth =
        (y, m) =>
            new Date(
                y,
                m + 1,
                0
            ).getDate();


    function addCalendarMonths(
        date,
        count
    ) {

        const targetMonth =
            date.getMonth() +
            count;

        const targetYear =
            date.getFullYear() +
            Math.floor(
                targetMonth / 12
            );

        const normalizedMonth =
            (
                targetMonth % 12 +
                12
            ) % 12;

        const targetDay =
            Math.min(
                date.getDate(),
                daysInMonth(
                    targetYear,
                    normalizedMonth
                )
            );

        return new Date(
            targetYear,
            normalizedMonth,
            targetDay
        );

    }


    let monthDate =
        addCalendarMonths(
            start,
            months
        );


    if (
        monthDate > today
    ) {

        months--;

        monthDate =
            addCalendarMonths(
                start,
                months
            );

    }


    const remainingDays =
        Math.floor(
            (
                today.getTime() -
                monthDate.getTime()
            ) /
            86400000
        );


    if (
        months > 0 &&
        remainingDays > 0
    )

        return `${months}m ${remainingDays}d`;


    if (months > 0)

        return `${months}m`;


    return `${remainingDays}d`;

}


function formatDate(
    dateString
) {

    if (!dateString)

        return "—";

    const d =
        new Date(
            dateString +
            "T00:00:00"
        );

    if (
        Number.isNaN(
            d.getTime()
        )
    )

        return "—";

    return d.toLocaleDateString(
        "en-GB",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric"
        }
    );

}


function formatDateTime(
    value
) {

    if (!value)

        return "—";

    const d =
        new Date(value);

    if (
        Number.isNaN(
            d.getTime()
        )
    )

        return "—";

    return d.toLocaleString(
        "en-GB",
        {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit"
        }
    );

}


function makeStatus(
    record
) {

    const value =
        normalized(
            record?.status
        );

    if (
        value ===
        "successful"
    )

        return "Successful";

    if (
        value ===
        "unsuccessful"
    )

        return "Unsuccessful";

    return "Pending";

}


function statusClass(
    status
) {

    return String(
        status ||
        "Pending"
    )
        .toLowerCase()
        .replace(
            /\s+/g,
            "-"
        );

}


function toast(
    message
) {

    const el =
        $("toast");

    if (!el) {

        alert(message);

        return;

    }

    el.textContent =
        message;

    el.classList.add(
        "show"
    );

    clearTimeout(
        toast.timer
    );

    toast.timer =
        setTimeout(
            () => {

                el.classList.remove(
                    "show"
                );

            },
            2800
        );

}


function setButtonLoading(
    button,
    loading,
    text
) {

    if (!button)

        return;

    button.disabled =
        loading;

    button.textContent =
        loading
            ? "Saving..."
            : text;

}


/* ==========================================================
   LOAD ALL DATA
========================================================== */

async function loadAll() {

    const [
        recordsRes,
        registryRes,
        auditRes
    ] = await Promise.all([

        apiRequest(
            "/api/records"
        ),

        apiRequest(
            "/api/registry"
        ),

        isLoggedIn &&
        normalized(
            currentUser
        ) ===
        "karthiknani"

            ? apiRequest(
                "/api/audit-logs"
            )

            : Promise.resolve([])

    ]);


    records =
        Array.isArray(
            recordsRes
        )
            ? recordsRes
            : [];


    registry =
        Array.isArray(
            registryRes
        )
            ? registryRes
            : [];


    auditLogs =
        Array.isArray(
            auditRes
        )
            ? auditRes
            : [];


    populateBuffaloDropdown();

    renderRecords();

    renderPending();

    renderRegistry();

    renderAudit();

    renderMetrics();

}


/* ==========================================================
   REGISTRY / RECORD HELPERS
========================================================== */

function getRegistryForRecord(
    record
) {

    if (
        record.buffalo_id
    ) {

        return registry.find(
            buffalo =>
                buffalo.id ===
                record.buffalo_id
        ) || null;

    }


    return registry.find(
        buffalo =>
            normalized(
                buffalo.name
            ) ===
            normalized(
                record.name
            ) &&
            normalized(
                buffalo.insurance_number
            ) ===
            normalized(
                record.insurance_number
            )
    ) || null;

}


function isRegistryTracked(
    buffalo
) {

    return records.some(
        record => {

            if (
                record.buffalo_id
            ) {

                return (
                    record.buffalo_id ===
                    buffalo.id
                );

            }

            return (
                normalized(
                    record.name
                ) ===
                normalized(
                    buffalo.name
                ) &&
                normalized(
                    record.insurance_number
                ) ===
                normalized(
                    buffalo.insurance_number
                )
            );

        }
    );

}


/* ==========================================================
   BUFFALO DROPDOWN
========================================================== */

function populateBuffaloDropdown() {

    const select =
        $("buffaloSelect");

    if (!select)

        return;

    const selected =
        select.value;

    select.innerHTML =
        `<option value="">— Choose Buffalo —</option>` +
        registry
            .map(
                buffalo =>
                    `<option value="${esc(
                        buffalo.id
                    )}">${esc(
                        buffalo.name
                    )} — ${esc(
                        buffalo.insurance_number ||
                        "No insurance number"
                    )}</option>`
            )
            .join("");


    if (
        selected &&
        registry.some(
            buffalo =>
                buffalo.id ===
                selected
        )
    )

        select.value =
            selected;

}


if ($("buffaloSelect")) {

    $("buffaloSelect")
        .addEventListener(
            "change",
            () => {

                const buffalo =
                    registry.find(
                        b =>
                            b.id ===
                            $("buffaloSelect")
                                .value
                    );


                if (
                    $("insuranceNumber")
                )

                    $("insuranceNumber")
                        .value =
                        buffalo
                            ?.insurance_number ||
                        "";

            }
        );

}


/* ==========================================================
   RENDER DAILY RECORDS
========================================================== */

function renderRecords() {

    const query =
        normalized(
            $("recordSearch")
                ?.value
        );


    const filtered =
        records.filter(
            record =>

                [
                    record.name,
                    record.insurance_number,
                    record.insemination_date,
                    record.birth_date,
                    makeStatus(record)
                ]
                    .join(" ")
                    .toLowerCase()
                    .includes(query)
        );


    if (!$("recordsBody"))

        return;


    $("recordsBody")
        .innerHTML =

        filtered
            .map(
                record => {

                    const status =
                        makeStatus(
                            record
                        );

                    const inseminationDays =
                        formatElapsedDuration(
                            record.insemination_date
                        );

<<<<<<< Updated upstream
                const inseminationDays =
                    formatElapsedDuration(
                        record.insemination_date
                    );


                const birthDays =
    formatElapsedDuration(
        record.birth_date
    );
=======
                    const birthDays =
                        formatElapsedDuration(
                            record.birth_date
                        );
>>>>>>> Stashed changes


                    const actionCell =
                        isLoggedIn

                            ? `
<td>

<div class="actions">

<button
    class="table-action"
    onclick="editRecord('${record.id}')"
>
    Edit
</button>

<button
    class="table-action delete"
    onclick="deleteRecord('${record.id}')"
>
    Delete
</button>

</div>

</td>
`

                            : "";


                    return `

<tr>

<td>

<strong>
    ${esc(record.name)}
</strong>

</td>

<td>
    ${esc(record.insurance_number)}
</td>

<td>
    ${formatDate(
        record.insemination_date
    )}
</td>

<td>
<<<<<<< Updated upstream

    ${
    inseminationDays
}

=======
    ${inseminationDays}
>>>>>>> Stashed changes
</td>

<td>
    ${formatDate(
        record.birth_date
    )}
</td>

<td>
    ${birthDays}
</td>

<td>

<<<<<<< Updated upstream
   ${
    birthDays
}
=======
<span
    class="status ${statusClass(status)} status-readonly"
>

    ${esc(status)}

</span>
>>>>>>> Stashed changes

</td>

${actionCell}

</tr>

`;

                }
            )
            .join("");


    if ($("emptyRecords"))

        $("emptyRecords")
            .classList.toggle(
                "hidden",
                filtered.length > 0
            );


    const actionHeader =
        $("recordsActionHeader");

    if (actionHeader)

        actionHeader.classList.toggle(
            "hidden",
            !isLoggedIn
        );

}
/* ==========================================================
   DAILY RECORDS SEARCH
========================================================== */

if ($("recordSearch")) {

    $("recordSearch")
        .addEventListener(
            "input",
            () => {

                renderRecords();

            }
        );

}

/* ==========================================================
   RENDER PENDING
========================================================== */

function renderPending() {

    const pending =
        registry.filter(
            buffalo =>
                !isRegistryTracked(
                    buffalo
                )
        );


    if ($("pendingBody")) {

        $("pendingBody")
            .innerHTML =

            pending
                .map(
                    buffalo => `

<tr>

<td>

<strong>
    ${esc(buffalo.name)}
</strong>

</td>

<td>
    ${esc(
        buffalo.insurance_number ||
        "—"
    )}
</td>

<td>

<span class="status pending">
    Pending
</span>

</td>

<td>

${
    isLoggedIn

        ? `
<button
    class="table-action"
    onclick="addPendingRecord('${buffalo.id}')"
>
    Add Record →
</button>
`

        : ""
}

</td>

</tr>

`
                )
                .join("");

    }


    if ($("emptyPending"))

        $("emptyPending")
            .classList.toggle(
                "hidden",
                pending.length > 0
            );


    if ($("pendingCount"))

        $("pendingCount")
            .textContent =
            `${pending.length} pending`;

}


/* ==========================================================
   METRICS
========================================================== */

function renderMetrics() {

    const successful =
        records.filter(
            record =>
                makeStatus(record) ===
                "Successful"
        ).length;


    const pending =
        registry.filter(
            buffalo =>
                !isRegistryTracked(
                    buffalo
                )
        ).length;


    if ($("metricRegistered"))

        $("metricRegistered")
            .textContent =
            registry.length;


    if ($("metricActive"))

        $("metricActive")
            .textContent =
            records.length;


    if ($("metricPending"))

        $("metricPending")
            .textContent =
            pending;


    if ($("metricSuccess"))

        $("metricSuccess")
            .textContent =
            successful;


    if ($("registryTotal"))

        $("registryTotal")
            .textContent =
            `${registry.length} buffaloes`;


    if ($("todayLabel"))

        $("todayLabel")
            .textContent =
            new Date()
                .toLocaleDateString(
                    "en-GB",
                    {
                        day: "2-digit",
                        month: "short",
                        year: "numeric"
                    }
                );

}


/* ==========================================================
   AUDIT SNAPSHOT
========================================================== */

function auditSnapshot(
    record
) {

    if (!record)

        return null;


    return {

        record_id:
            record.id,

        name:
            record.name,

        insurance_number:
            record.insurance_number,

        insemination_date:
            record.insemination_date,

        days_elapsed_from_insemination:
            daysElapsed(
                record.insemination_date
            ),

        birth_date:
            record.birth_date,

        days_elapsed_birth:
            record.birth_date
                ? daysElapsed(
                    record.birth_date
                )
                : null,

        status:
            makeStatus(
                record
            )

    };

}


/* ==========================================================
   WRITE DAILY RECORD AUDIT
========================================================== */

async function writeAudit(
    action,
    oldRecord,
    newRecord
) {

    const oldData =
        oldRecord
            ? auditSnapshot(
                oldRecord
            )
            : null;


    const newData =
        newRecord
            ? auditSnapshot(
                newRecord
            )
            : null;


    await apiRequest(
        "/api/audit-logs",
        {
            method: "POST",

            body:
                JSON.stringify({

                    changed_by:
                        currentUser,

                    record_id:
                        newData?.record_id ||
                        oldData?.record_id ||
                        null,

                    name:
                        newData?.name ||
                        oldData?.name ||
                        null,

                    insurance_number:
                        newData?.insurance_number ||
                        oldData?.insurance_number ||
                        null,

                    insemination_date:
                        newData?.insemination_date ||
                        oldData?.insemination_date ||
                        null,

                    days_elapsed_from_insemination:
                        newData?.days_elapsed_from_insemination ??
                        oldData?.days_elapsed_from_insemination ??
                        null,

                    birth_date:
                        newData?.birth_date ||
                        oldData?.birth_date ||
                        null,

                    days_elapsed_birth:
                        newData?.days_elapsed_birth ??
                        oldData?.days_elapsed_birth ??
                        null,

                    status:
                        newData?.status ||
                        oldData?.status ||
                        null,

                    action:
                        action,

                    old_name:
                        oldData?.name ||
                        null,

                    old_insurance_number:
                        oldData?.insurance_number ||
                        null,

                    old_insemination_date:
                        oldData?.insemination_date ||
                        null,

                    old_birth_date:
                        oldData?.birth_date ||
                        null,

                    old_status:
                        oldData?.status ||
                        null,

                    new_name:
                        newData?.name ||
                        null,

                    new_insurance_number:
                        newData?.insurance_number ||
                        null,

                    new_insemination_date:
                        newData?.insemination_date ||
                        null,

                    new_birth_date:
                        newData?.birth_date ||
                        null,

                    new_status:
                        newData?.status ||
                        null

                })

        }
    );

}


/* ==========================================================
   WRITE REGISTRY AUDIT
========================================================== */

async function writeRegistryAudit(
    action,
    oldBuffalo,
    newBuffalo
) {

    await apiRequest(
        "/api/audit-logs",
        {
            method: "POST",

            body:
                JSON.stringify({

                    changed_by:
                        currentUser,

                    record_id:
                        newBuffalo?.id ||
                        oldBuffalo?.id ||
                        null,

                    name:
                        newBuffalo?.name ||
                        oldBuffalo?.name ||
                        null,

                    insurance_number:
                        newBuffalo?.insurance_number ||
                        oldBuffalo?.insurance_number ||
                        null,

                    insemination_date:
                        null,

                    days_elapsed_from_insemination:
                        null,

                    birth_date:
                        null,

                    days_elapsed_birth:
                        null,

                    status:
                        null,

                    action:
                        action,

                    old_name:
                        oldBuffalo?.name ||
                        null,

                    old_insurance_number:
                        oldBuffalo?.insurance_number ||
                        null,

                    old_insemination_date:
                        null,

                    old_birth_date:
                        null,

                    old_status:
                        null,

                    new_name:
                        newBuffalo?.name ||
                        null,

                    new_insurance_number:
                        newBuffalo?.insurance_number ||
                        null,

                    new_insemination_date:
                        null,

                    new_birth_date:
                        null,

                    new_status:
                        null

                })

        }
    );

}

/* ==========================================================
   DAILY RECORD FORM
========================================================== */

if ($("recordForm")) {

    $("recordForm")
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();

                const editId =
                    $("editId")
                        .value;

                const buffaloId =
                    $("buffaloSelect")
                        .value;

                const buffalo =
                    registry.find(
                        b =>
                            b.id ===
                            buffaloId
                    );

                if (!buffalo) {

                    alert(
                        "Please select a buffalo from the Buffalo Registry."
                    );

                    return;

                }

                const inseminationDate =
                    $("inseminationDate")
                        .value;

                const birthDate =
                    $("birthDate")
                        .value;

                if (
                    !inseminationDate &&
                    !birthDate
                ) {

                    alert(
                        "Please enter at least one date: Insemination Date or Birth Date."
                    );

                    return;

                }

                const data = {

                    buffalo_id:
                        buffalo.id,

                    name:
                        buffalo.name,

                    insurance_number:
                        buffalo.insurance_number,

                    insemination_date:
                        inseminationDate ||
                        null,

                    birth_date:
                        birthDate ||
                        null,

                    status:
                        $("recordStatus")
                            .value ||
                        "Pending",

                    updated_by:
                        currentUser

                };


                const button =
                    $("saveBtn");

                const normalText =
                    editId
                        ? "Update Entry →"
                        : "Save Entry →";


                setButtonLoading(
                    button,
                    true,
                    normalText
                );


                try {

                    /* =================================
                       EDIT DAILY RECORD
                    ================================= */

                    if (editId) {

                        const oldRecord =
                            records.find(
                                record =>
                                    record.id ===
                                    editId
                            );


                        if (!oldRecord) {

                            throw new Error(
                                "Original record could not be found."
                            );

                        }


                        const updated =
                            await apiRequest(
                                `/api/records/${encodeURIComponent(editId)}`,
                                {
                                    method: "PUT",

                                    body:
                                        JSON.stringify(
                                            data
                                        )
                                }
                            );


                        await writeAudit(
                            "EDIT",
                            oldRecord,
                            updated
                        );


                        toast(
                            "Record updated. Old and new values saved."
                        );

                    }


                    /* =================================
                       CREATE DAILY RECORD
                    ================================= */

                    else {

                        const created =
                            await apiRequest(
                                "/api/records",
                                {
                                    method: "POST",

                                    body:
                                        JSON.stringify({

                                            ...data,

                                            created_by:
                                                currentUser

                                        })
                                }
                            );


                        await writeAudit(
                            "CREATE",
                            null,
                            created
                        );


                        toast(
                            "Record saved and audit log created."
                        );

                    }


                    resetRecordForm();

                    await loadAll();

                }

                catch (error) {

                    console.error(
                        error
                    );

                    alert(
                        "Could not save the record.\n\n" +
                        error.message
                    );

                }

                finally {

                    setButtonLoading(
                        button,
                        false,
                        normalText
                    );

                }

            }
        );

}


/* ==========================================================
   EDIT DAILY RECORD
========================================================== */

window.editRecord =
function(id) {

    if (!isLoggedIn) {

        toast(
            "Please login first."
        );

        return;

    }


    const record =
        records.find(
            item =>
                item.id ===
                id
        );


    if (!record)

        return;


    const buffalo =
        record.buffalo_id

            ? registry.find(
                b =>
                    b.id ===
                    record.buffalo_id
            )

            : getRegistryForRecord(
                record
            );


    if (!buffalo) {

        alert(
            "This record is not linked to a buffalo in the master registry."
        );

        return;

    }


    $("editId")
        .value =
        record.id;


    $("buffaloSelect")
        .value =
        buffalo.id;


    $("insuranceNumber")
        .value =
        buffalo.insurance_number ||
        record.insurance_number ||
        "";


    $("inseminationDate")
        .value =
        record.insemination_date ||
        "";


    $("birthDate")
        .value =
        record.birth_date ||
        "";


    $("recordStatus")
        .value =
        makeStatus(
            record
        );


    $("recordStatus")
        .disabled =
        false;


    if ($("formTitle"))

        $("formTitle")
            .textContent =
            "Edit Daily Record";


    if ($("editingBadge"))

        $("editingBadge")
            .classList.remove(
                "hidden"
            );


    $("saveBtn")
        .textContent =
        "Update Entry →";


    if ($("cancelEdit"))

        $("cancelEdit")
            .classList.remove(
                "hidden"
            );


    const recordsTab =
        document.querySelector(
            '[data-tab="records"]'
        );


    if (recordsTab)

        recordsTab.click();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

};


/* ==========================================================
   RESET DAILY RECORD FORM
========================================================== */

function resetRecordForm() {

    if ($("recordForm"))

        $("recordForm")
            .reset();


    if ($("editId"))

        $("editId")
            .value =
            "";


    if ($("insuranceNumber"))

        $("insuranceNumber")
            .value =
            "";


    if ($("recordStatus")) {

        $("recordStatus")
            .value =
            "Pending";

        $("recordStatus")
            .disabled =
            true;

    }


    if ($("formTitle"))

        $("formTitle")
            .textContent =
            "Add Daily Record";


    if ($("editingBadge"))

        $("editingBadge")
            .classList.add(
                "hidden"
            );


    if ($("saveBtn"))

        $("saveBtn")
            .textContent =
            "Save Entry →";


    if ($("cancelEdit"))

        $("cancelEdit")
            .classList.add(
                "hidden"
            );

}


/* ==========================================================
   CANCEL DAILY RECORD EDIT
========================================================== */

if ($("cancelEdit")) {

    $("cancelEdit")
        .addEventListener(
            "click",
            () => {

                resetRecordForm();

            }
        );

}


/* ==========================================================
   ADD PENDING RECORD
========================================================== */

window.addPendingRecord =
function(id) {

    if (!isLoggedIn) {

        toast(
            "Please login first."
        );

        return;

    }


    const buffalo =
        registry.find(
            item =>
                item.id ===
                id
        );


    if (!buffalo)

        return;


    if ($("editId"))

        $("editId")
            .value =
            "";


    if ($("buffaloSelect"))

        $("buffaloSelect")
            .value =
            buffalo.id;


    if ($("insuranceNumber"))

        $("insuranceNumber")
            .value =
            buffalo.insurance_number ||
            "";


    if ($("inseminationDate"))

        $("inseminationDate")
            .value =
            "";


    if ($("birthDate"))

        $("birthDate")
            .value =
            "";


    if ($("recordStatus")) {

        $("recordStatus")
            .value =
            "Pending";

        $("recordStatus")
            .disabled =
            false;

    }


    if ($("formTitle"))

        $("formTitle")
            .textContent =
            "Add Daily Record";


    if ($("editingBadge"))

        $("editingBadge")
            .classList.add(
                "hidden"
            );


    if ($("saveBtn"))

        $("saveBtn")
            .textContent =
            "Save Entry →";


    if ($("cancelEdit"))

        $("cancelEdit")
            .classList.add(
                "hidden"
            );


    const recordsTab =
        document.querySelector(
            '[data-tab="records"]'
        );


    if (recordsTab)

        recordsTab.click();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

};


/* ==========================================================
   DELETE DAILY RECORD
========================================================== */

window.deleteRecord =
async function(id) {

    if (!isLoggedIn) {

        toast(
            "Please login first."
        );

        return;

    }


    const record =
        records.find(
            item =>
                item.id ===
                id
        );


    if (!record)

        return;


    if (
        !confirm(
            `Delete the tracking record for "${record.name}"?\n\nThe deletion will be preserved in Audit Logs.`
        )
    )

        return;


    try {

        await writeAudit(
            "DELETE",
            record,
            null
        );


        await apiRequest(
            `/api/records/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );


        await loadAll();


        toast(
            "Record deleted. The audit history was preserved."
        );

    }

    catch (error) {

        console.error(
            error
        );


        alert(
            "Could not delete the record.\n\n" +
            error.message
        );

    }

};


/* ==========================================================
   BUFFALO REGISTRY - ADD / EDIT
========================================================== */

if ($("registryForm")) {

    $("registryForm")
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();


                const editId =
                    $("registryEditId")
                        ?.value
                        ?.trim() ||
                    "";


                const name =
                    $("registryName")
                        .value
                        .trim();


                const insurance =
                    $("registryInsurance")
                        .value
                        .trim();


                if (
                    !name ||
                    !insurance
                ) {

                    alert(
                        "Buffalo name and insurance number are required."
                    );

                    return;

                }


                const button =
                    $("registrySaveBtn");


                const originalText =
                    editId
                        ? "Update Buffalo →"
                        : "Add to Master List →";


                if (button) {

                    button.disabled =
                        true;

                    button.innerHTML =
                        editId
                            ? "Updating..."
                            : "Saving...";

                }


                try {

                    /* ==================================
                       EDIT EXISTING BUFFALO
                    ================================== */

                    if (editId) {

                        const oldBuffalo =
                            registry.find(
                                buffalo =>
                                    String(
                                        buffalo.id
                                    ) ===
                                    String(
                                        editId
                                    )
                            );


                        if (!oldBuffalo) {

                            throw new Error(
                                "The buffalo could not be found in the current registry."
                            );

                        }


                        const updatedBuffalo =
                            await apiRequest(
                                `/api/registry/${encodeURIComponent(editId)}`,
                                {
                                    method: "PUT",

                                    body:
                                        JSON.stringify({

                                            name:
                                                name,

                                            insurance_number:
                                                insurance,

                                            added_by:
                                                oldBuffalo.added_by ||
                                                currentUser

                                        })
                                }
                            );


                        await writeRegistryAudit(
                            "EDIT",
                            oldBuffalo,
                            updatedBuffalo
                        );


                        const relatedRecords =
                            records.filter(
                                record =>
                                    String(
                                        record.buffalo_id
                                    ) ===
                                    String(
                                        editId
                                    )
                            );


                        for (
                            const record
                            of relatedRecords
                        ) {

                            const oldRecord =
                                {
                                    ...record
                                };


                            const updatedRecord =
                                await apiRequest(
                                    `/api/records/${encodeURIComponent(record.id)}`,
                                    {
                                        method: "PUT",

                                        body:
                                            JSON.stringify({

                                                buffalo_id:
                                                    updatedBuffalo.id,

                                                name:
                                                    updatedBuffalo.name,

                                                insurance_number:
                                                    updatedBuffalo.insurance_number,

                                                insemination_date:
                                                    record.insemination_date,

                                                birth_date:
                                                    record.birth_date,

                                                status:
                                                    record.status,

                                                updated_by:
                                                    currentUser

                                            })
                                    }
                                );


                            await writeAudit(
                                "EDIT",
                                oldRecord,
                                updatedRecord
                            );

                        }


                        resetRegistryForm();

                        await loadAll();


                        toast(
                            "Registry entry updated."
                        );

                    }


                    /* ==================================
                       CREATE NEW BUFFALO
                    ================================== */

                    else {

                        const createdBuffalo =
                            await apiRequest(
                                "/api/registry",
                                {
                                    method: "POST",

                                    body:
                                        JSON.stringify({

                                            id:
                                                crypto.randomUUID(),

                                            name:
                                                name,

                                            insurance_number:
                                                insurance,

                                            added_by:
                                                currentUser

                                        })
                                }
                            );


                        await writeRegistryAudit(
                            "CREATE",
                            null,
                            createdBuffalo
                        );


                        $("registryForm")
                            .reset();


                        await loadAll();


                        toast(
                            `${name} added to the master list.`
                        );

                    }

                }

                catch (error) {

                    console.error(
                        error
                    );


                    alert(
                        "Could not save buffalo.\n\n" +
                        error.message
                    );

                }

                finally {

                    if (button) {

                        button.disabled =
                            false;

                        button.innerHTML =
                            originalText;

                    }

                }

            }
        );

}


/* ==========================================================
   RESET REGISTRY FORM
========================================================== */

function resetRegistryForm() {

    if ($("registryForm"))

        $("registryForm")
            .reset();


    if ($("registryEditId"))

        $("registryEditId")
            .value =
            "";


    if ($("registryFormTitle"))

        $("registryFormTitle")
            .textContent =
            "Buffalo Registry";


    if ($("registrySaveBtn"))

        $("registrySaveBtn")
            .textContent =
            "Add to Master List →";


    if ($("registryCancelEdit"))

        $("registryCancelEdit")
            .classList.add(
                "hidden"
            );

}


/* ==========================================================
   EDIT REGISTRY
========================================================== */

window.editRegistry =
async function(id) {

    if (!isLoggedIn) {

        toast(
            "Please login first."
        );

        return;

    }


    const buffalo =
        registry.find(
            item =>
                item.id ===
                id
        );


    if (!buffalo)

        return;


    if ($("registryEditId"))

        $("registryEditId")
            .value =
            buffalo.id;


    if ($("registryName"))

        $("registryName")
            .value =
            buffalo.name ||
            "";


    if ($("registryInsurance"))

        $("registryInsurance")
            .value =
            buffalo.insurance_number ||
            "";


    if ($("registryFormTitle"))

        $("registryFormTitle")
            .textContent =
            "Edit Buffalo";


    if ($("registrySaveBtn"))

        $("registrySaveBtn")
            .textContent =
            "Update Buffalo →";


    if ($("registryCancelEdit"))

        $("registryCancelEdit")
            .classList.remove(
                "hidden"
            );


    const registryTab =
        document.querySelector(
            '[data-tab="registry"]'
        );


    if (registryTab)

        registryTab.click();


    window.scrollTo({
        top: 0,
        behavior: "smooth"
    });

};


/* ==========================================================
   CANCEL REGISTRY EDIT
========================================================== */

if ($("registryCancelEdit")) {

    $("registryCancelEdit")
        .addEventListener(
            "click",
            () => {

                resetRegistryForm();

            }
        );

}

/* ==========================================================
   RENDER REGISTRY
========================================================== */

function renderRegistry() {

    const query =
        normalized(
            $("registrySearch")?.value
        );


    const filtered =
        registry.filter(
            buffalo =>

                [
                    buffalo.name,
                    buffalo.insurance_number,
                    buffalo.added_by
                ]
                    .join(" ")
                    .toLowerCase()
                    .includes(query)
        );


    if (!$("registryBody"))

        return;


    $("registryBody")
        .innerHTML =

        filtered
            .map(
                buffalo => `

<tr>

<td>

<strong>
    ${esc(
        buffalo.name
    )}
</strong>

</td>

<td>

    ${esc(
        buffalo.insurance_number ||
        "—"
    )}

</td>

<td>

    ${esc(
        buffalo.added_by ||
        "—"
    )}

</td>

<td>

${
    isLoggedIn

        ? `

<div class="actions">

<button
    class="table-action"
    onclick="editRegistry('${buffalo.id}')"
>
    Edit
</button>

<button
    class="table-action delete"
    onclick="deleteRegistry('${buffalo.id}')"
>
    Remove
</button>

</div>

`

        : ""
}

</td>

</tr>

`
            )
            .join("");


    if ($("emptyRegistry"))

        $("emptyRegistry")
            .classList.toggle(
                "hidden",
                filtered.length > 0
            );

}


/* ==========================================================
   DELETE REGISTRY
========================================================== */

window.deleteRegistry =
async function(id) {

    if (!isLoggedIn) {

        toast(
            "Please login first."
        );

        return;

    }


    const buffalo =
        registry.find(
            item =>
                item.id ===
                id
        );


    if (!buffalo)

        return;


    if (
        isRegistryTracked(
            buffalo
        )
    ) {

        alert(
            "This buffalo has an active tracking record.\n\n" +
            "Delete the tracking record first if you really want " +
            "to remove the buffalo from the master registry."
        );

        return;

    }


    if (
        !confirm(
            `Remove "${buffalo.name}" from the Buffalo Registry?`
        )
    )

        return;


    try {

        await writeRegistryAudit(
            "DELETE",
            buffalo,
            null
        );


        await apiRequest(
            `/api/registry/${encodeURIComponent(id)}`,
            {
                method: "DELETE"
            }
        );


        await loadAll();


        toast(
            "Registry entry removed."
        );

    }

    catch (error) {

        console.error(
            error
        );


        alert(
            "Could not remove buffalo.\n\n" +
            error.message
        );

    }

};


/* ==========================================================
   REGISTRY SEARCH
========================================================== */

if ($("registrySearch")) {

    $("registrySearch")
        .addEventListener(
            "input",
            renderRegistry
        );

}


/* ==========================================================
   AUDIT LOG RENDER
========================================================== */

function renderAudit() {

    if (
        !isLoggedIn ||
        normalized(
            currentUser
        ) !==
        "karthiknani"
    ) {

        if ($("auditBody"))

            $("auditBody")
                .innerHTML =
                "";

        return;

    }


    if (!$("auditBody"))

        return;


    const query =
        normalized(
            $("auditSearch")?.value
        );


    const filtered =
        auditLogs.filter(
            log =>

                [
                    log.changed_by,
                    log.name,
                    log.insurance_number,
                    log.action,
                    log.status,
                    log.old_name,
                    log.new_name
                ]
                    .join(" ")
                    .toLowerCase()
                    .includes(query)
        );


    $("auditBody")
        .innerHTML =

        filtered
            .map(
                log => {

                    const action =
                        String(
                            log.action ||
                            ""
                        )
                            .toUpperCase();


                    return `

<tr>

<td>

    ${formatDateTime(
        log.changed_at
    )}

</td>

<td>

    ${esc(
        log.changed_by ||
        "—"
    )}

</td>

<td>

<strong>

    ${esc(
        log.name ||
        "—"
    )}

</strong>

</td>

<td>

    ${esc(
        log.insurance_number ||
        "—"
    )}

</td>

<td>

<span
    class="status ${statusClass(action)}"
>

    ${esc(
        action
    )}

</span>

</td>

<td>

<button
    class="table-action"
    onclick="viewAuditChanges('${log.id}')"
>

    View Changes

</button>

</td>

</tr>

`;

                }
            )
            .join("");


    if ($("emptyAudit"))

        $("emptyAudit")
            .classList.toggle(
                "hidden",
                filtered.length > 0
            );

}


/* ==========================================================
   AUDIT SEARCH
========================================================== */

if ($("auditSearch")) {

    $("auditSearch")
        .addEventListener(
            "input",
            renderAudit
        );

}


/* ==========================================================
   AUDIT CHANGE MODAL
========================================================== */

window.viewAuditChanges =
function(id) {

    if (
        !isLoggedIn ||
        normalized(
            currentUser
        ) !==
        "karthiknani"
    ) {

        toast(
            "Audit Logs are available only to karthiknani."
        );

        return;

    }


    const log =
        auditLogs.find(
            item =>
                item.id ===
                id
        );


    if (!log)

        return;


    const rows = [

        [
            "Buffalo Name",
            log.old_name,
            log.new_name
        ],

        [
            "Insurance Number",
            log.old_insurance_number,
            log.new_insurance_number
        ],

        [
            "Insemination Date",
            formatDate(
                log.old_insemination_date
            ),
            formatDate(
                log.new_insemination_date
            )
        ],

        [
            "Birth Date",
            formatDate(
                log.old_birth_date
            ),
            formatDate(
                log.new_birth_date
            )
        ],

        [
            "Status",
            log.old_status,
            log.new_status
        ]

    ];


    if ($("auditChangesContent")) {

        $("auditChangesContent")
            .innerHTML = `

<table class="audit-change-table">

<thead>

<tr>

<th>
    Field
</th>

<th>
    Old Value
</th>

<th>
    New Value
</th>

</tr>

</thead>

<tbody>

${rows.map(
    row => `

<tr>

<td class="audit-change-field">

    <strong>
        ${esc(row[0])}
    </strong>

</td>

<td class="audit-old-value">

    <span class="audit-value-label">
        PREVIOUS
    </span>

    ${esc(
        row[1] ||
        "—"
    )}

</td>

<td class="audit-new-value">

    <span class="audit-value-label">
        UPDATED
    </span>

    ${esc(
        row[2] ||
        "—"
    )}

</td>

</tr>

`
).join("")}

</tbody>

</table>

`;

    }


    if ($("auditModal"))

        $("auditModal")
            .classList.remove(
                "hidden"
            );

};


/* ==========================================================
   CLOSE AUDIT MODAL
========================================================== */

window.closeAuditModal =
function() {

    if ($("auditModal"))

        $("auditModal")
            .classList.add(
                "hidden"
            );

};


/* ==========================================================
   ESCAPE KEY - CLOSE MODAL
========================================================== */

document.addEventListener(
    "keydown",
    event => {

        if (
            event.key ===
            "Escape"
        ) {

            closeAuditModal();

        }

    }
);


/* ==========================================================
   NAVIGATION
========================================================== */

/* ==========================================================
   NAVIGATION TABS
========================================================== */

const navTabs =
    document.querySelectorAll(
        ".nav-tab"
    );


navTabs.forEach(
    tab => {

        tab.addEventListener(
            "click",
            () => {

                const target =
                    tab.dataset.tab;


                if (!target)
                    return;

                /* Clear Daily Records search when leaving the page */
/* ==========================================================
   CLEAR SEARCH WHEN LEAVING A PAGE
========================================================== */

/* Daily Records */
if (
    target !== "records" &&
    $("recordSearch")
) {

    $("recordSearch").value = "";

}

/* Buffalo Registry */
if (
    target !== "registry" &&
    $("registrySearch")
) {

    $("registrySearch").value = "";

}

/* Audit Logs */
if (
    target !== "audit" &&
    $("auditSearch")
) {

    $("auditSearch").value = "";

}


                /*
                 * Public users can view
                 * Daily Records and Buffalo Registry.
                 */

                if (
                    !isLoggedIn &&
                    target !== "records" &&
                    target !== "registry"
                ) {

                    toast(
                        "Please login to access this section."
                    );

                    return;

                }


                /*
                 * Audit Logs are only
                 * available to karthiknani.
                 */

                if (
                    target === "audit" &&
                    normalized(
                        currentUser
                    ) !==
                    "karthiknani"
                ) {

                    toast(
                        "Audit Logs are available only to karthiknani."
                    );

                    return;

                }


                /*
                 * Change active navigation button.
                 */

                navTabs.forEach(
                    item => {

                        item.classList.toggle(
                            "active",
                            item === tab
                        );

                    }
                );


                /*
                 * Show ONLY the selected page.
                 */

                document
                    .querySelectorAll(
                        ".tab-content"
                    )
                    .forEach(
                        section => {

                            section.classList.toggle(
                                "active",
                                section.id ===
                                target
                            );

                        }
                    );


                /*
                 * Refresh selected page.
                 */

                if (
                    target ===
                    "records"
                ) {

                    renderRecords();

                    renderPending();

                }


                if (
                    target ===
                    "registry"
                ) {

                    renderRegistry();

                }


                if (
                    target ===
                    "audit"
                ) {

                    renderAudit();

                }

            }
        );

    }
);


/* ==========================================================
   LOGIN / PUBLIC VIEW ACCESS CONTROL
========================================================== */

function updateAccessUI() {

    const loginButton =
        $("loginButton");

    const userMenu =
        $("userMenu");

    const registryNav =
        $("registryNav");

    const auditNav =
        $("auditNav");

    const recordEntryCard =
        $("recordEntryCard");

    const pendingHeading =
        $("pendingSectionHeading");

    const pendingCard =
        $("pendingSectionCard");

    const actionHeader =
        $("recordsActionHeader");


    if (loginButton)

        loginButton.classList.toggle(
            "hidden",
            isLoggedIn
        );


    if (userMenu)

        userMenu.classList.toggle(
            "hidden",
            !isLoggedIn
        );


    /*
     * Buffalo Registry remains visible
     * to public users in read-only mode.
     */

    if (registryNav)

        registryNav.classList.remove(
            "hidden"
        );


    /*
     * Only karthiknani can see
     * Audit Logs.
     */

    if (auditNav)

        auditNav.classList.toggle(
            "hidden",
            !(
                isLoggedIn &&
                normalized(
                    currentUser
                ) ===
                "karthiknani"
            )
        );


    /*
     * Management controls are hidden
     * for public users.
     */

    if (recordEntryCard)

        recordEntryCard.classList.toggle(
            "hidden",
            !isLoggedIn
        );


    if (pendingHeading)

        pendingHeading.classList.toggle(
            "hidden",
            !isLoggedIn
        );


    if (pendingCard)

        pendingCard.classList.toggle(
            "hidden",
            !isLoggedIn
        );


    if (actionHeader)

        actionHeader.classList.toggle(
            "hidden",
            !isLoggedIn
        );


    const registryManagementCard =
        $("registryManagementCard");

    const registryActionHeader =
        $("registryActionHeader");


    if (registryManagementCard)

        registryManagementCard.classList.toggle(
            "hidden",
            !isLoggedIn
        );


    if (registryActionHeader)

        registryActionHeader.classList.toggle(
            "hidden",
            !isLoggedIn
        );


    if ($("currentUser"))

        $("currentUser")
            .textContent =
            currentUser ||
            "";


    if ($("currentUserAvatar"))

        $("currentUserAvatar")
            .textContent =
            currentUser
                ? currentUser
                    .charAt(0)
                    .toUpperCase()
                : "";


    if ($("auditUser"))

        $("auditUser")
            .textContent =
            currentUser ||
            "";

}


/* ==========================================================
   OPEN LOGIN SCREEN
========================================================== */

function openLogin() {

    const welcome =
        $("welcomeScreen");


    if (!welcome)

        return;


    welcome.classList.add(
        "login-overlay"
    );


    welcome.classList.remove(
        "hidden"
    );


    const input =
    $("viewerName");


    if (input) {

        input.value =
            "";

        setTimeout(
            () =>
                input.focus(),
            100
        );

    }

}


window.openLogin =
    openLogin;


/* ==========================================================
   ENTER SITE
========================================================== */

function enterSite() {

   const input =
    $("viewerName");

const name =
    input?.value
        ?.trim() ||
    "";


    if (!name) {

        toast(
            "Please enter your name."
        );

        return;

    }


    currentUser =
        name;

    isLoggedIn =
        true;


    const welcome =
        $("welcomeScreen");


    if (welcome) {

        welcome.classList.add(
            "hidden"
        );

        welcome.classList.remove(
            "login-overlay"
        );

    }


    updateAccessUI();


    const auditNav =
        $("auditNav");


    if (auditNav) {

        auditNav.classList.toggle(
            "hidden",
            normalized(
                currentUser
            ) !==
            "karthiknani"
        );

    }


    loadAll()
        .catch(
            error => {

                console.error(
                    error
                );

                toast(
                    "Logged in, but data refresh failed."
                );

            }
        );

}


window.enterSite =
    enterSite;


/* ==========================================================
   WELCOME / LOGIN FORM
========================================================== */

if ($("welcomeForm")) {

    $("welcomeForm")
        .addEventListener(
            "submit",
            event => {

                event.preventDefault();

                enterSite();

            }
        );

}


/* ==========================================================
   LOGOUT
========================================================== */

function logout() {

    currentUser =
        "";

    isLoggedIn =
        false;


    
    closeAuditModal();

if ($("recordSearch")) {
    $("recordSearch").value = "";
}

if ($("registrySearch")) {
    $("registrySearch").value = "";
}

if ($("auditSearch")) {
    $("auditSearch").value = "";
}


    document.querySelectorAll(
        ".nav-tab"
    ).forEach(
        tab =>
            tab.classList.remove(
                "active"
            )
    );


    const recordsTab =
        document.querySelector(
            '[data-tab="records"]'
        );


    if (recordsTab)

        recordsTab.classList.add(
            "active"
        );


   document.querySelectorAll(
    ".tab-content"
).forEach(
    section =>
        section.classList.remove(
            "active"
        )
);


    const recordsSection =
        $("records");


    if (recordsSection)

        recordsSection.classList.add(
            "active"
        );


    updateAccessUI();


    renderRecords();

    renderPending();

    renderAudit();


    toast(
        "Logged out. Daily Records are now in read-only mode."
    );

}


window.logout =
    logout;


/* ==========================================================
   CHANGE USER / LOGOUT BUTTON
========================================================== */

if ($("changeUser")) {

    $("changeUser")
        .addEventListener(
            "click",
            () => {

                logout();

            }
        );

}


/* ==========================================================
   INITIAL PAGE LOAD
========================================================== */

document.addEventListener(
    "DOMContentLoaded",
    () => {

        currentUser =
            "";

        isLoggedIn =
            false;


        updateAccessUI();


        /*
         * Public mode:
         * Daily Records and Buffalo Registry
         * are loaded immediately.
         *
         * Audit Logs are not requested.
         */

        loadAll()
            .catch(
                error => {

                    console.error(
                        "Initial data load failed:",
                        error
                    );


                    toast(
                        "Unable to load dairy data."
                    );

                }
            );

    }
);