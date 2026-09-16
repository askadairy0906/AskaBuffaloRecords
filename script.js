/* ==========================================================
   ASKA DAIRY FARM
   GitHub Pages + Supabase
   FINAL VERSION
========================================================== */


/* ==========================================================
   SUPABASE CONNECTION
========================================================== */

const SUPABASE_URL =
    "https://zmcsydaadxybnsxircti.supabase.co";

const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_U5p9tVbt7iqpUdkL0gcxEA_FAinSGsP";


const supabaseClient =
    window.supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


/* ==========================================================
   GLOBAL DATA
========================================================== */

let records = [];

let registry = [];

let auditLogs = [];

let currentUser = "";


const $ = id =>
    document.getElementById(id);


/* ==========================================================
   UTILITY FUNCTIONS
========================================================== */


/* HTML escape */

function esc(value) {

    return String(value ?? "")
        .replace(
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


/* Normalize text */

function normalized(value) {

    return String(value ?? "")
        .trim()
        .toLowerCase();

}


/* Today's date at midnight */

function todayStart() {

    const d = new Date();

    return new Date(
        d.getFullYear(),
        d.getMonth(),
        d.getDate()
    );

}


/* Calculate elapsed days */

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
            todayStart() - d
        ) / 86400000
    );

}


/* Format date */

function formatDate(dateString) {

    if (!dateString)

        return "—";


    const d =
        new Date(
            dateString + "T00:00:00"
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


/* Format date + time */

function formatDateTime(value) {

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


/* ==========================================================
   STATUS
========================================================== */

function makeStatus(record) {

    const value =
        normalized(
            record?.status
        );


    if (
        value ===
        "successful"
    ) {

        return "Successful";

    }


    if (
        value ===
        "unsuccessful"
    ) {

        return "Unsuccessful";

    }


    return "Pending";

}


/* Convert status to CSS class */

function statusClass(status) {

    return String(
        status || "Pending"
    )
        .toLowerCase()
        .replace(
            /\s+/g,
            "-"
        );

}


/* ==========================================================
   TOAST
========================================================== */

function toast(message) {

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


/* ==========================================================
   BUTTON LOADING
========================================================== */

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
   DATABASE LOADING
========================================================== */

async function loadAll() {

    const [

        recordsRes,

        registryRes,

        auditRes

    ] = await Promise.all([


        supabaseClient

            .from(
                "buffalo_records"
            )

            .select("*")

            .order(
                "created_at",
                {
                    ascending: false
                }
            ),


        supabaseClient

            .from(
                "buffalo_registry"
            )

            .select("*")

            .order(
                "created_at",
                {
                    ascending: false
                }
            ),


        supabaseClient

            .from(
                "audit_logs"
            )

            .select("*")

            .order(
                "changed_at",
                {
                    ascending: false
                }
            )

    ]);


    if (recordsRes.error)

        throw recordsRes.error;


    if (registryRes.error)

        throw registryRes.error;


    if (auditRes.error)

        throw auditRes.error;


    records =
        recordsRes.data || [];


    registry =
        registryRes.data || [];


    auditLogs =
        auditRes.data || [];


    populateBuffaloDropdown();

    renderRecords();

    renderPending();

    renderRegistry();

    renderAudit();

    renderMetrics();

}


/* ==========================================================
   REGISTRY / RECORD MATCHING
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
            )

            &&

            normalized(
                buffalo.insurance_number
            ) ===
            normalized(
                record.insurance_number
            )

    ) || null;

}


/* Check whether registry buffalo has active record */

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
                )

                &&

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

        `<option value="">
            — Choose Buffalo —
        </option>`

        +

        registry.map(
            buffalo => `

                <option
                    value="${esc(buffalo.id)}"
                >

                    ${esc(
                        buffalo.name
                    )}

                    —

                    ${esc(
                        buffalo.insurance_number ||
                        "No insurance number"
                    )}

                </option>

            `
        ).join("");


    if (
        selected &&
        registry.some(
            buffalo =>
                buffalo.id ===
                selected
        )
    ) {

        select.value =
            selected;

    }

}


/* Buffalo selection */

if ($("buffaloSelect")) {

    $("buffaloSelect")
        .addEventListener(
            "change",
            () => {

                const buffalo =
                    registry.find(
                        b =>
                            b.id ===
                            $("buffaloSelect").value
                    );


                $("insuranceNumber")
                    .value =
                    buffalo?.insurance_number ||
                    "";

            }
        );

}


/* ==========================================================
   ACTIVE TRACKING RECORDS
========================================================== */

function renderRecords() {

    const query =
        normalized(
            $("recordSearch")?.value
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
                        daysElapsed(
                            record.insemination_date
                        );


                    const birthDays =
                        record.birth_date

                            ? daysElapsed(
                                record.birth_date
                            )

                            : null;


                    return `

<tr>


<td>

    <strong>
        ${esc(record.name)}
    </strong>

</td>


<td>
    ${esc(
        record.insurance_number
    )}
</td>


<td>
    ${formatDate(
        record.insemination_date
    )}
</td>


<td>
    ${
        inseminationDays ??
        "—"
    }
</td>


<td>
    ${formatDate(
        record.birth_date
    )}
</td>


<td>
    ${
        birthDays ??
        "—"
    }
</td>


<td>

    <span
        class="status ${statusClass(status)} status-readonly"
    >

        ${esc(status)}

    </span>

</td>


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


</tr>

`;

                }
            )

            .join("");


    if ($("emptyRecords")) {

        $("emptyRecords")
            .classList.toggle(
                "hidden",
                filtered.length > 0
            );

    }

}


/* ==========================================================
   PENDING ANIMALS
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

    <span class="status pending">

        Pending

    </span>

</td>


<td>

    <button
        class="table-action"
        onclick="addPendingRecord('${buffalo.id}')"
    >

        Add Record →

    </button>

</td>


</tr>

`
                )

                .join("");

    }


    if ($("emptyPending")) {

        $("emptyPending")
            .classList.toggle(
                "hidden",
                pending.length > 0
            );

    }


    if ($("pendingCount")) {

        $("pendingCount")
            .textContent =
            `${pending.length} pending`;

    }

}


/* ==========================================================
   DASHBOARD METRICS
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
            makeStatus(record)

    };

}


/* ==========================================================
   WRITE AUDIT
   OLD RECORD + NEW RECORD
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


    const { error } =
        await supabaseClient

            .from(
                "audit_logs"
            )

            .insert({

                changed_by:
                    currentUser,


                record_id:

                    newData?.record_id ||

                    oldData?.record_id ||


                    null,


                /* CURRENT / MAIN VALUES */

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

                    newData
                        ?.days_elapsed_from_insemination

                    ??

                    oldData
                        ?.days_elapsed_from_insemination

                    ??

                    null,


                birth_date:

                    newData?.birth_date ||

                    oldData?.birth_date ||

                    null,


                days_elapsed_birth:

                    newData
                        ?.days_elapsed_birth

                    ??

                    oldData
                        ?.days_elapsed_birth

                    ??

                    null,


                status:

                    newData?.status ||

                    oldData?.status ||

                    null,


                action:


                    action,


                /* =================================
                   OLD VALUES
                ================================= */

                old_name:

                    oldData?.name ||

                    null,


                old_insurance_number:

                    oldData
                        ?.insurance_number ||

                    null,


                old_insemination_date:

                    oldData
                        ?.insemination_date ||

                    null,


                old_birth_date:

                    oldData
                        ?.birth_date ||

                    null,


                old_status:

                    oldData?.status ||

                    null,


                /* =================================
                   NEW VALUES
                ================================= */

                new_name:

                    newData?.name ||

                    null,


                new_insurance_number:

                    newData
                        ?.insurance_number ||

                    null,


                new_insemination_date:

                    newData
                        ?.insemination_date ||

                    null,


                new_birth_date:

                    newData
                        ?.birth_date ||

                    null,


                new_status:

                    newData?.status ||

                    null

            });


    if (error)

        throw error;

}


/* ==========================================================
   CREATE / EDIT DAILY RECORD
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


                /* =================================
                   AT LEAST ONE DATE REQUIRED
                ================================= */

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
                       EDIT
                    ================================= */

                    if (editId) {


                        /*
                           IMPORTANT:
                           Capture original record
                           BEFORE updating it.
                        */

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


                        /*
                           Update database
                        */

                        const {
                            data: updated,
                            error
                        } =

                            await supabaseClient

                                .from(
                                    "buffalo_records"
                                )

                                .update(
                                    data
                                )

                                .eq(
                                    "id",
                                    editId
                                )

                                .select()

                                .single();


                        if (error)

                            throw error;


                        /*
                           SAVE OLD + NEW
                        */

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
                       CREATE
                    ================================= */

                    else {


                        const {

                            data: created,

                            error

                        } =

                            await supabaseClient

                                .from(
                                    "buffalo_records"
                                )

                                .insert({

                                    ...data,

                                    created_by:
                                        currentUser

                                })

                                .select()

                                .single();


                        if (error)

                            throw error;


                        /*
                           CREATE:
                           no old value,
                           only new value.
                        */

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
   EDIT RECORD
========================================================== */

window.editRecord =
function(id) {

    const record =
        records.find(
            item =>
                item.id === id
        );


    if (!record)

        return;


    let buffalo =

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


    /*
       Status becomes editable
       ONLY after Edit is clicked.
    */

    $("recordStatus")
        .value =
        makeStatus(record);


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


    $("cancelEdit")
        .classList.remove(
            "hidden"
        );


    window.scrollTo({

        top: 0,

        behavior: "smooth"

    });

};


/* ==========================================================
   RESET RECORD FORM
========================================================== */

function resetRecordForm() {

    if (!$("recordForm"))

        return;


    $("recordForm")
        .reset();


    $("editId")
        .value =
        "";


    $("insuranceNumber")
        .value =
        "";


    /*
       Default status is Pending,
       but DISABLED.
    */

    $("recordStatus")
        .value =
        "Pending";


    $("recordStatus")
        .disabled =
        true;


    if ($("formTitle"))

        $("formTitle")
            .textContent =
            "Add Daily Record";


    if ($("editingBadge"))

        $("editingBadge")
            .classList.add(
                "hidden"
            );


    $("saveBtn")
        .textContent =
        "Save Entry →";


    $("cancelEdit")
        .classList.add(
            "hidden"
        );

}


/* Cancel edit */

if ($("cancelEdit")) {

    $("cancelEdit")
        .addEventListener(
            "click",
            resetRecordForm
        );

}


/* ==========================================================
   ADD PENDING RECORD
========================================================== */

window.addPendingRecord =
function(id) {

    const buffalo =
        registry.find(
            b =>
                b.id === id
        );


    if (!buffalo)

        return;


    /*
       New record
    */

    $("editId")
        .value =
        "";


    $("buffaloSelect")
        .value =
        buffalo.id;


    $("insuranceNumber")
        .value =
        buffalo.insurance_number ||
        "";


    $("inseminationDate")
        .value =
        "";


    $("birthDate")
        .value =
        "";


    /*
       Status is NOT editable
       until Edit.
    */

    $("recordStatus")
        .value =
        "Pending";


    $("recordStatus")
        .disabled =
        true;


    if ($("formTitle"))

        $("formTitle")
            .textContent =
            "Add Daily Record";


    if ($("editingBadge"))

        $("editingBadge")
            .classList.add(
                "hidden"
            );


    $("saveBtn")
        .textContent =
        "Save Entry →";


    $("cancelEdit")
        .classList.add(
            "hidden"
        );


    /*
       Open Daily Records tab
    */

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

    const record =
        records.find(
            item =>
                item.id === id
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


        /*
           IMPORTANT:
           Save complete old record
           BEFORE deletion.
        */

        await writeAudit(
            "DELETE",
            record,
            null
        );


        const {
            error
        } =

            await supabaseClient

                .from(
                    "buffalo_records"
                )

                .delete()

                .eq(
                    "id",
                    id
                );


        if (error)

            throw error;


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
   BUFFALO REGISTRY - ADD
========================================================== */

if ($("registryForm")) {

    $("registryForm")
        .addEventListener(
            "submit",
            async event => {

                event.preventDefault();


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


                try {


                    const {
                        error
                    } =

                        await supabaseClient

                            .from(
                                "buffalo_registry"
                            )

                            .insert({

                                name,

                                insurance_number:
                                    insurance,

                                added_by:
                                    currentUser

                            });


                    if (error)

                        throw error;


                    $("registryForm")
                        .reset();


                    await loadAll();


                    toast(
                        `${name} added to the master list.`
                    );

                }


                catch (error) {

                    console.error(
                        error
                    );


                    alert(
                        "Could not add buffalo.\n\n" +
                        error.message
                    );

                }

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

</td>


</tr>

`
            )

            .join("");


    if ($("emptyRegistry")) {

        $("emptyRegistry")
            .classList.toggle(
                "hidden",
                filtered.length > 0
            );

    }

}


/* ==========================================================
   EDIT REGISTRY
========================================================== */

window.editRegistry =
async function(id) {

    const buffalo =
        registry.find(
            item =>
                item.id === id
        );


    if (!buffalo)

        return;


    const newName =
        prompt(
            "Buffalo name:",
            buffalo.name
        );


    if (
        newName === null
    )

        return;


    const newInsurance =
        prompt(
            "Insurance number:",
            buffalo.insurance_number ||
            ""
        );


    if (
        newInsurance === null
    )

        return;


    if (
        !newName.trim() ||
        !newInsurance.trim()
    ) {

        alert(
            "Name and insurance number cannot be empty."
        );

        return;

    }


    try {


        const {
            error
        } =

            await supabaseClient

                .from(
                    "buffalo_registry"
                )

                .update({

                    name:
                        newName.trim(),

                    insurance_number:
                        newInsurance.trim()

                })

                .eq(
                    "id",
                    id
                );


        if (error)

            throw error;


        await loadAll();


        toast(
            "Registry entry updated."
        );

    }


    catch (error) {

        console.error(
            error
        );


        alert(
            "Could not update registry.\n\n" +
            error.message
        );

    }

};


/* ==========================================================
   DELETE REGISTRY
========================================================== */

window.deleteRegistry =
async function(id) {

    const buffalo =
        registry.find(
            item =>
                item.id === id
        );


    if (!buffalo)

        return;


    /*
       Do not allow removal
       while actively tracked.
    */

    if (
        isRegistryTracked(
            buffalo
        )
    ) {

        alert(
            "This buffalo has an active tracking record.\n\nDelete the tracking record first if you really want to remove the buffalo from the master registry."
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


        const {
            error
        } =

            await supabaseClient

                .from(
                    "buffalo_registry"
                )

                .delete()

                .eq(
                    "id",
                    id
                );


        if (error)

            throw error;


        await loadAll();


        toast(
            "Buffalo removed from the master list."
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


/* Registry search */

if ($("registrySearch")) {

    $("registrySearch")
        .addEventListener(
            "input",
            renderRegistry
        );

}


/* ==========================================================
   AUDIT LOGS
========================================================== */

function renderAudit() {

    const query =
        normalized(
            $("auditSearch")?.value
        );


    const filtered =
        auditLogs.filter(
            log =>

                Object
                    .values(log)
                    .join(" ")
                    .toLowerCase()
                    .includes(query)

        );


    if (!$("auditBody"))

        return;


    $("auditBody")
        .innerHTML =

        filtered

            .map(
                log => `

<tr>


<td>

    ${formatDateTime(
        log.changed_at
    )}

</td>


<td>

    <strong>

        ${esc(
            log.changed_by
        )}

    </strong>

</td>


<td>

    ${esc(
        log.name
    )}

</td>


<td>

    ${esc(
        log.insurance_number
    )}

</td>


<td>

    ${formatDate(
        log.insemination_date
    )}

</td>


<td>

    ${
        log.days_elapsed_from_insemination
        ??
        "—"
    }

</td>


<td>

    ${formatDate(
        log.birth_date
    )}

</td>


<td>

    ${
        log.days_elapsed_birth
        ??
        "—"
    }

</td>


<td>

    <span
        class="status ${statusClass(log.status)}"
    >

        ${esc(
            log.status ||
            "—"
        )}

    </span>

</td>


<td>

    <strong>

        ${esc(
            log.action
        )}

    </strong>


    ${
        log.action === "EDIT"

            ? `

                <button
                    class="table-action"
                    onclick="viewAuditChanges('${log.id}')"
                    style="margin-left:8px;"
                >

                    View Changes

                </button>

              `

            : ""

    }

</td>


</tr>

`
            )

            .join("");


    if ($("emptyAudit")) {

        $("emptyAudit")
            .classList.toggle(
                "hidden",
                filtered.length > 0
            );

    }

}


/* Audit search */

if ($("auditSearch")) {

    $("auditSearch")
        .addEventListener(
            "input",
            renderAudit
        );

}


/* ==========================================================
   VIEW OLD → NEW AUDIT CHANGES
========================================================== */

window.viewAuditChanges =
function(id) {

    const log =
        auditLogs.find(
            item =>
                item.id === id
        );

    if (!log)
        return;

    const changes = [];

    function formatValue(value) {

        if (
            value === null ||
            value === undefined ||
            value === ""
        ) {
            return "—";
        }

        return esc(String(value));
    }

    function addChange(field, oldValue, newValue) {

        const oldRaw = oldValue ?? "";
        const newRaw = newValue ?? "";

        if (oldRaw !== newRaw) {

            changes.push(`
                <tr>
                    <td class="audit-change-field">
                        ${field}
                    </td>

                    <td class="audit-old-value">
                        <span class="audit-value-label">
                            Previous
                        </span>
                        ${formatValue(oldValue)}
                    </td>

                    <td class="audit-new-value">
                        <span class="audit-value-label">
                            Updated
                        </span>
                        ${formatValue(newValue)}
                    </td>
                </tr>
            `);
        }
    }

    addChange(
        "Buffalo Name",
        log.old_name,
        log.new_name
    );

    addChange(
        "Insurance Number",
        log.old_insurance_number,
        log.new_insurance_number
    );

    addChange(
        "Insemination Date",
        log.old_insemination_date
            ? formatDate(log.old_insemination_date)
            : null,
        log.new_insemination_date
            ? formatDate(log.new_insemination_date)
            : null
    );

    addChange(
        "Birth Date",
        log.old_birth_date
            ? formatDate(log.old_birth_date)
            : null,
        log.new_birth_date
            ? formatDate(log.new_birth_date)
            : null
    );

    addChange(
        "Status",
        log.old_status,
        log.new_status
    );

    const content = $("auditChangesContent");

    if (!content)
        return;

    if (changes.length === 0) {

        content.innerHTML = `
            <div class="audit-no-change">
                No field values changed.
            </div>
        `;

    } else {

        content.innerHTML = `
            <table class="audit-change-table">
                <thead>
                    <tr>
                        <th>Field</th>
                        <th>Previous Value</th>
                        <th>Updated Value</th>
                    </tr>
                </thead>
                <tbody>
                    ${changes.join("")}
                </tbody>
            </table>
        `;
    }

    const modal = $("auditModal");

    if (!modal)
        return;

    modal.classList.remove("hidden");

    document.body.style.overflow = "hidden";
};


/* Close audit modal */

window.closeAuditModal =
function() {

    const modal = $("auditModal");

    if (modal) {
        modal.classList.add("hidden");
    }

    document.body.style.overflow = "";
};


/* Close audit modal with Escape */

document.addEventListener(
    "keydown",
    event => {

        if (event.key === "Escape") {
            closeAuditModal();
        }

    }
);

/* ==========================================================
   EXPORT AUDIT LOGS
========================================================== */

if ($("exportAudit")) {

    $("exportAudit")
        .addEventListener(
            "click",
            () => {


                const headers = [

                    "Date & Time",

                    "Changed By",

                    "Name",

                    "Insurance Number",

                    "Insemination Date",

                    "Days Elapsed From Insemination",

                    "Birth Date",

                    "Days Elapsed From Birth",

                    "Status",

                    "Action",

                    "OLD Name",

                    "NEW Name",

                    "OLD Insurance",

                    "NEW Insurance",

                    "OLD Insemination Date",

                    "NEW Insemination Date",

                    "OLD Birth Date",

                    "NEW Birth Date",

                    "OLD Status",

                    "NEW Status"

                ];


                const rows =

                    auditLogs.map(
                        log => [

                            formatDateTime(
                                log.changed_at
                            ),

                            log.changed_by,

                            log.name,

                            log.insurance_number,

                            formatDate(
                                log.insemination_date
                            ),

                            log
                                .days_elapsed_from_insemination,

                            formatDate(
                                log.birth_date
                            ),

                            log
                                .days_elapsed_birth,

                            log.status,

                            log.action,


                            /* OLD */

                            log.old_name,

                            /* NEW */

                            log.new_name,

                            log.old_insurance_number,

                            log.new_insurance_number,

                            formatDate(
                                log.old_insemination_date
                            ),

                            formatDate(
                                log.new_insemination_date
                            ),

                            formatDate(
                                log.old_birth_date
                            ),

                            formatDate(
                                log.new_birth_date
                            ),

                            log.old_status,

                            log.new_status

                        ]
                    );


                const csv =

                    [
                        headers,
                        ...rows
                    ]

                        .map(
                            row =>

                                row
                                    .map(
                                        value =>

                                            `"${String(
                                                value ??
                                                ""
                                            ).replaceAll(
                                                '"',
                                                '""'
                                            )}"`
                                    )

                                    .join(",")

                        )

                        .join("\n");


                const blob =
                    new Blob(
                        [csv],
                        {
                            type:
                                "text/csv;charset=utf-8"
                        }
                    );


                const url =
                    URL.createObjectURL(
                        blob
                    );


                const a =
                    document.createElement(
                        "a"
                    );


                a.href =
                    url;


                a.download =
                    `aska-audit-logs-${
                        new Date()
                            .toISOString()
                            .slice(0, 10)
                    }.csv`;


                a.click();


                URL.revokeObjectURL(
                    url
                );

            }
        );

}


/* ==========================================================
   RECORD SEARCH
========================================================== */

if ($("recordSearch")) {

    $("recordSearch")
        .addEventListener(
            "input",
            renderRecords
        );

}


/* ==========================================================
   TABS
========================================================== */

document
    .querySelectorAll(
        ".nav-tab"
    )
    .forEach(
        button => {


            button.addEventListener(
                "click",
                () => {


                    const target =
                        button.dataset.tab;


                    /*
                       Only karthiknani
                       can open Audit Logs.
                    */

                    if (

                        target === "audit"

                        &&

                        normalized(
                            currentUser
                        ) !==
                        "karthiknani"

                    ) {

                        return;

                    }


                    document

                        .querySelectorAll(
                            ".nav-tab"
                        )

                        .forEach(
                            b =>

                                b.classList.toggle(
                                    "active",
                                    b === button
                                )

                        );


                    document

                        .querySelectorAll(
                            ".tab-content"
                        )

                        .forEach(
                            section =>

                                section.classList.toggle(
                                    "active",
                                    section.id === target
                                )

                        );


                    window.scrollTo({

                        top: 0,

                        behavior: "smooth"

                    });

                }
            );

        }
    );


/* ==========================================================
   USER ENTRY
========================================================== */

async function enterSite() {

    const name =
        $("viewerName")
            .value
            .trim();


    if (!name) {

        $("nameError")
            .textContent =
            "Please enter your name.";

        return;

    }


    currentUser =
        name;


    if ($("currentUser"))

        $("currentUser")
            .textContent =
            currentUser;


    if ($("auditUser"))

        $("auditUser")
            .textContent =
            currentUser;


    if ($("userAvatar"))

        $("userAvatar")
            .textContent =
            currentUser
                .charAt(0)
                .toUpperCase();


    $("welcomeScreen")
        .classList.add(
            "hidden"
        );


    $("app")
        .classList.remove(
            "hidden"
        );


    /*
       Audit Logs visible ONLY
       to karthiknani.
    */

    const isAuditUser =
        normalized(
            currentUser
        ) ===
        "karthiknani";


    if ($("auditNav"))

        $("auditNav")
            .classList.toggle(
                "hidden",
                !isAuditUser
            );


    try {

        await loadAll();

    }

    catch (error) {

        console.error(
            error
        );


        alert(

            "The ASKA website could not connect to Supabase.\n\n" +

            error.message +

            "\n\nCheck that the database tables and policies have been created."

        );

    }

}


/* Welcome form */

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


/* Change user */

if ($("changeUser")) {

    $("changeUser")
        .addEventListener(
            "click",
            () => {

                location.reload();

            }
        );

}


/* ==========================================================
   START
========================================================== */

if ($("viewerName")) {

    $("viewerName")
        .focus();

}