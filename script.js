const $ = s => document.querySelector(s);

const KEY = "rupeerise_expenses_v1";
const BK = "rupeerise_budget_v1";

const cats = {
    Food: ["🍜", "#9b7bff"],
    Travel: ["🚌", "#77a8ff"],
    Study: ["📚", "#68e0b2"],
    Shopping: ["🛍️", "#ffbd72"],
    Bills: ["⚡", "#ff7b9c"],
    Other: ["✦", "#8e92a8"]
};

let expenses = [];

try {
    expenses = JSON.parse(localStorage.getItem(KEY) || "[]");
} catch {
    expenses = [];
}

let budget = Number(localStorage.getItem(BK)) || 5000;
let chart = null;
let timer;

const money = n =>
    new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        maximumFractionDigits: 2
    }).format(n);

const monthly = () => {
    let d = new Date();

    return expenses.filter(e => {
        let x = new Date(e.date + "T00:00:00");

        return x.getMonth() === d.getMonth() &&
               x.getFullYear() === d.getFullYear();
    });
};

const safe = s =>
    String(s).replace(/[&<>"']/g, c => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    }[c]));

function toast(s) {
    $("#toast").textContent = s;
    $("#toast").classList.add("show");

    clearTimeout(timer);

    timer = setTimeout(() => {
        $("#toast").classList.remove("show");
    }, 2400);
}

function stats() {
    let a = monthly();

    let total = a.reduce(
        (s, e) => s + Number(e.amount),
        0
    );

    let pct = Math.round(total / budget * 100);

    $("#total").textContent = money(total);
    $("#count").textContent = a.length;

    $("#average").textContent = money(
        total / Math.max(new Date().getDate(), 1)
    );

    $("#month").textContent =
        new Date().toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric"
        });

    $("#budget").value = budget;

    $("#progress").style.width =
        Math.min(pct, 100) + "%";

    $("#progress").style.background =
        pct > 100
            ? "#ff5252"
            : "linear-gradient(90deg,#ffbd72,#ff8d7b)";

    $("#budgetNote").textContent =
        total > budget
            ? money(total - budget) + " over budget"
            : money(budget - total) + " left";
}

function drawChart() {
    let a = monthly();
    let totals = {};

    a.forEach(e => {
        totals[e.category] =
            (totals[e.category] || 0) + Number(e.amount);
    });

    let labels = Object.keys(totals);

    $("#chartEmpty").style.display =
        labels.length ? "none" : "grid";

    $("#legend").innerHTML = labels.map(l =>
        `<span>
            <i style="background:${cats[l][1]}"></i>
            ${l} <b>${money(totals[l])}</b>
        </span>`
    ).join("");

    if (typeof Chart === "undefined") return;

    if (chart) chart.destroy();

    chart = new Chart($("#chart"), {
        type: "doughnut",

        data: {
            labels,

            datasets: [{
                data: labels.map(l => totals[l]),
                backgroundColor: labels.map(l => cats[l][1]),
                borderColor: "#141622",
                borderWidth: 4,
                hoverOffset: 7
            }]
        },

        options: {
            responsive: true,
            maintainAspectRatio: false,
            cutout: "72%",

            plugins: {
                legend: {
                    display: false
                },

                tooltip: {
                    backgroundColor: "#202234",

                    callbacks: {
                        label: c => " " + money(c.raw)
                    }
                }
            }
        }
    });
}

function renderList() {
    let q = $("#search").value.toLowerCase();
    let f = $("#filter").value;

    let a = [...expenses]
        .filter(e =>
            (f === "All" || e.category === f) &&
            (`${e.title} ${e.category} ${e.date}`)
                .toLowerCase()
                .includes(q)
        )
        .sort((x, y) =>
            y.date.localeCompare(x.date) || y.id - x.id
        );

    $("#list").innerHTML = a.map(e =>
        `<tr>
            <td>
                <span class="name">
                    ${cats[e.category][0]} &nbsp; ${safe(e.title)}
                </span>
            </td>

            <td>
                <span class="badge">${safe(e.category)}</span>
            </td>

            <td>
                ${new Date(e.date + "T00:00:00")
                    .toLocaleDateString("en-IN", {
                        day: "numeric",
                        month: "short",
                        year: "numeric"
                    })}
            </td>

            <td class="amount">${money(e.amount)}</td>

            <td>
                <button class="delete"
                    data-id="${e.id}"
                    title="Delete">✕</button>
            </td>
        </tr>`
    ).join("");

    $("#empty").style.display =
        a.length ? "none" : "block";

    $("#records").textContent =
        `${a.length} record${a.length === 1 ? "" : "s"}`;
}

function render() {
    stats();
    drawChart();
    renderList();
}

// Initial page setup
$("#date").value = new Date().toISOString().slice(0, 10);
$("#year").textContent = new Date().getFullYear();

// Add an expense
$("#form").addEventListener("submit", e => {
    e.preventDefault();

    let title = $("#title").value.trim();
    let amount = Number($("#amount").value);
    let category = $("#category").value;
    let date = $("#date").value;

    if (
        !title ||
        !Number.isFinite(amount) ||
        amount <= 0 ||
        !date
    ) {
        toast("Please enter valid expense details.");
        return;
    }

    expenses.push({
        id: Date.now(),
        title,
        amount,
        category,
        date
    });

    localStorage.setItem(KEY, JSON.stringify(expenses));

    e.target.reset();

    $("#date").value = new Date().toISOString().slice(0, 10);

    render();
    toast("Expense added successfully ✦");
});

// Save monthly budget
$("#saveBudget").onclick = () => {
    let n = Number($("#budget").value);

    if (!Number.isFinite(n) || n <= 0) {
        toast("Enter a budget greater than zero.");
        $("#budget").value = budget;
        return;
    }

    budget = n;

    localStorage.setItem(BK, budget);

    stats();
    toast("Monthly budget updated");
};

$("#budget").addEventListener("keydown", e => {
    if (e.key === "Enter") {
        $("#saveBudget").click();
    }
});

// Delete an individual expense
$("#list").addEventListener("click", e => {
    let b = e.target.closest("[data-id]");

    if (!b) return;

    expenses = expenses.filter(
        x => x.id !== Number(b.dataset.id)
    );

    localStorage.setItem(KEY, JSON.stringify(expenses));

    render();
    toast("Expense deleted");
});

// Clear all expenses
$("#clear").onclick = () => {
    if (!expenses.length) {
        toast("No expenses to clear");
        return;
    }

    if (confirm("Delete all saved expenses? This cannot be undone.")) {
        expenses = [];

        localStorage.setItem(KEY, "[]");

        render();
        toast("All expenses cleared");
    }
};

// Search and category filter
$("#search").addEventListener("input", renderList);
$("#filter").addEventListener("change", renderList);

// Jump to the expense form
$("#jump").onclick = () => {
    $("#add").scrollIntoView({
        behavior: "smooth"
    });

    setTimeout(() => $("#title").focus(), 350);
};

// Display saved data
render();